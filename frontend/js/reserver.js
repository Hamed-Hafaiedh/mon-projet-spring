document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:8080/api';
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const durationPreview = document.getElementById('durationPreview');
    const pricePreview = document.getElementById('pricePreview');
    const submitBtn = document.getElementById('submitBtn');
    let parkingPricePerHour = 0;

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

    // Gestion de la déconnexion
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Récupérer l'ID du parking depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const parkingId = urlParams.get('parkingId');

    if (!parkingId) {
        window.location.href = 'parkings.html';
        return;
    }

    // Charger les infos basiques du parking pour l'affichage du nom
    try {
        const response = await fetch(`${API_URL}/parkings/${parkingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const parking = await response.json();
            document.getElementById('parkingName').textContent = parking.name;
            parkingPricePerHour = Number(parking.pricePerHour || 0);
            updatePreview();
        } else {
            document.getElementById('parkingName').textContent = `Parking #${parkingId}`;
        }
    } catch (e) {
        document.getElementById('parkingName').textContent = `Parking #${parkingId}`;
    }

    // Configurer les dates minimales (maintenant)
    const defaultStart = new Date(Date.now() + 15 * 60 * 1000);
    const defaultEnd = new Date(Date.now() + 75 * 60 * 1000);
    const minValue = formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000));
    startInput.min = minValue;
    endInput.min = minValue;
    startInput.value = formatDateTimeLocal(defaultStart);
    endInput.value = formatDateTimeLocal(defaultEnd);
    updatePreview();

    startInput.addEventListener('change', () => {
        endInput.min = startInput.value || minValue;
        if (endInput.value && startInput.value && endInput.value <= startInput.value) {
            const start = new Date(startInput.value);
            endInput.value = formatDateTimeLocal(new Date(start.getTime() + 60 * 60 * 1000));
        }
        updatePreview();
    });
    endInput.addEventListener('change', updatePreview);

    // Gestion du formulaire
    document.getElementById('reservationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const startTime = startInput.value;
        const endTime = endInput.value;

        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');

        if (new Date(endTime) <= new Date(startTime)) {
            errorMessage.textContent = "L'heure de fin doit être après l'heure de début.";
            errorMessage.classList.remove('hidden');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Reservation en cours...';

        try {
            const response = await fetch(`${API_URL}/reservations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    parkingId: parseInt(parkingId),
                    startTime: startTime + ':00', // Format LocalDateTime Spring
                    endTime: endTime + ':00'
                })
            });

            if (response.ok) {
                successMessage.textContent = 'Reservation reussie. Redirection vers votre historique...';
                successMessage.classList.remove('hidden');
                setTimeout(() => {
                    window.location.href = 'mes-reservations.html';
                }, 900);
            } else {
                const data = await parseErrorResponse(response);
                throw new Error(data.message || 'Erreur lors de la reservation.');
            }
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirmer la réservation';
        }
    });

    function updatePreview() {
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            durationPreview.textContent = '-';
            pricePreview.textContent = '-';
            return;
        }

        const minutes = Math.ceil((end - start) / (1000 * 60));
        const hours = Math.max(1, Math.ceil(minutes / 60));
        const total = parkingPricePerHour > 0 ? (hours * parkingPricePerHour).toFixed(2) : null;

        durationPreview.textContent = `${hours} h`;
        pricePreview.textContent = total ? `${total} TND` : 'Calcul indisponible';
    }

    async function parseErrorResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }
        const text = await response.text();
        return { message: text || `Erreur HTTP ${response.status}` };
    }

    function formatDateTimeLocal(date) {
        const pad = (value) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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
});