document.addEventListener('DOMContentLoaded', () => {
    const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:8080/api';
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('Erreur parsing user:', e);
        }
    }

    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && user) {
        userGreeting.textContent = `Bonjour, ${resolveDisplayName(user)}`;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    async function loadReservations() {
        const loading = document.getElementById('loading');
        const emptyMessage = document.getElementById('emptyMessage');
        const tableBody = document.getElementById('reservationsTableBody');

        if (loading) loading.classList.remove('hidden');
        if (emptyMessage) emptyMessage.classList.add('hidden');
        if (tableBody) tableBody.innerHTML = '';

        try {
            const response = await fetch(`${API_URL}/reservations/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                    return;
                }
                const message = await parseErrorResponse(response, 'Impossible de charger les reservations');
                throw new Error(message);
            }

            const reservations = await response.json();
            if (loading) loading.classList.add('hidden');
            if (tableBody) tableBody.innerHTML = '';

            if (reservations.length === 0) {
                if (emptyMessage) emptyMessage.classList.remove('hidden');
                return;
            }

            reservations.forEach(res => {
                let statusBadge = '';
                let actionBtn = '';
                const start = new Date(res.startTime);
                const end = new Date(res.endTime);
                const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
                const unitPrice = typeof res.pricePerHour === 'number'
                    ? res.pricePerHour
                    : (res.parking && typeof res.parking.pricePerHour === 'number' ? res.parking.pricePerHour : 0);
                const totalPrice = typeof res.totalPrice === 'number'
                    ? res.totalPrice.toFixed(2)
                    : (durationHours * unitPrice).toFixed(2);
                const parkingName = res.parkingName
                    || (res.parking ? res.parking.name : 'Parking #' + (res.parkingId || 'N/A'));

                if (res.status === 'PENDING') {
                    statusBadge = '<span class="pill pill-warning">En attente</span>';
                    actionBtn = `
                        <div class="table-action-group">
                            <button onclick="payer(${res.id}, this)" class="btn btn-success text-sm">Payer</button>
                            <button onclick="annuler(${res.id}, this)" class="btn btn-danger text-sm">Annuler</button>
                        </div>
                    `;
                } else if (res.status === 'CONFIRMED') {
                    statusBadge = '<span class="pill pill-success">Paye / Confirme</span>';
                    actionBtn = `<span class="action-muted text-sm">Aucune action</span>`;
                } else {
                    statusBadge = '<span class="pill pill-danger">Annule</span>';
                    actionBtn = `<span class="action-muted text-sm">-</span>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Parking" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${parkingName}</td>
                    <td data-label="Debut" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${start.toLocaleString()}</td>
                    <td data-label="Fin" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${end.toLocaleString()}</td>
                    <td data-label="Prix total" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">${totalPrice} TND</td>
                    <td data-label="Statut" class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td data-label="Actions" class="px-6 py-4 whitespace-nowrap text-center table-actions">${actionBtn}</td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (error) {
            if (loading) {
                loading.classList.remove('hidden');
                loading.innerText = error.message || 'Erreur lors du chargement de vos reservations.';
            }
            console.error(error);
        }
    }

    window.payer = async function(reservationId, actionButton) {
        if (!confirm("Voulez-vous procéder au paiement de cette réservation ?")) return;

        toggleActionButton(actionButton, true, 'Paiement...');

        try {
            const response = await fetch(`${API_URL}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reservationId })
            });

            if (response.ok) {
                showAlert("Paiement réussi !", "success");
                loadReservations(); // recharger la liste
            } else {
                const message = await parseErrorResponse(response, 'Erreur lors du paiement');
                throw new Error(message);
            }
        } catch (error) {
            showAlert(error.message, "error");
        } finally {
            toggleActionButton(actionButton, false, 'Payer');
        }
    }

    window.annuler = async function(reservationId, actionButton) {
        if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) return;

        toggleActionButton(actionButton, true, 'Annulation...');

        try {
            const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                showAlert("Réservation annulée.", "success");
                loadReservations();
            } else {
                const message = await parseErrorResponse(response, "Impossible d'annuler");
                throw new Error(message);
            }
        } catch (error) {
            showAlert(error.message, "error");
        } finally {
            toggleActionButton(actionButton, false, 'Annuler');
        }
    }

    async function parseErrorResponse(response, fallbackMessage) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                const data = await response.json();
                return data.message || fallbackMessage;
            } catch (error) {
                return fallbackMessage;
            }
        }

        try {
            const raw = (await response.text()).trim();
            return raw || fallbackMessage;
        } catch (error) {
            return fallbackMessage;
        }
    }

    function toggleActionButton(button, isLoading, loadingText) {
        if (!button) return;

        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
            button.classList.add('opacity-70', 'cursor-not-allowed');
            return;
        }

        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
        button.classList.remove('opacity-70', 'cursor-not-allowed');
        delete button.dataset.originalText;
    }

    function showAlert(message, type) {
        const ad = document.getElementById('alertMessage');
        ad.textContent = message;
        if (type === 'success') {
            ad.className = 'alert-box alert-success mb-4';
        } else {
            ad.className = 'alert-box alert-error mb-4';
        }
        ad.classList.remove('hidden');
        setTimeout(() => ad.classList.add('hidden'), 5000);
    }

    function resolveDisplayName(currentUser) {
        const rawName = (currentUser && typeof currentUser.name === 'string') ? currentUser.name.trim() : '';
        if (rawName) return rawName;

        const rawEmail = (currentUser && typeof currentUser.email === 'string') ? currentUser.email.trim() : '';
        if (rawEmail.includes('@')) {
            const emailPrefix = rawEmail.split('@')[0].replace(/[._-]+/g, ' ').trim();
            if (emailPrefix) return emailPrefix;
        }

        return 'Utilisateur';
    }

    loadReservations();
});