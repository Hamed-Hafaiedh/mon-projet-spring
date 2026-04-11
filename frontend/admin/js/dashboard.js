document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:8080/api';
    const PARKINGS_API = `${API_BASE}/parkings`;
    const ADMIN_API = `${API_BASE}/admin`;

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '../login.html';
        return;
    }

    let user = null;
    try {
        user = JSON.parse(userStr);
    } catch (error) {
        localStorage.removeItem('user');
        window.location.href = '../login.html';
        return;
    }

    if (!user || user.role !== 'ADMIN') {
        window.location.href = '../parkings.html';
        return;
    }

    const byId = (id) => document.getElementById(id);

    const userGreeting = byId('userGreeting');
    const logoutBtn = byId('logoutBtn');
    const alertMessage = byId('alertMessage');

    const loading = byId('loading');
    const emptyMessage = byId('emptyMessage');
    const parkingsTableBody = byId('parkingsTableBody');
    const adminResultsCount = byId('adminResultsCount');

    const adminSearchInput = byId('adminSearchInput');
    const adminAvailabilityFilter = byId('adminAvailabilityFilter');
    const adminSortFilter = byId('adminSortFilter');
    const adminMinPriceInput = byId('adminMinPriceInput');
    const adminMaxPriceInput = byId('adminMaxPriceInput');
    const adminClearFiltersBtn = byId('adminClearFiltersBtn');

    const parkingModal = byId('parkingModal');
    const modalTitle = byId('modalTitle');
    const parkingForm = byId('parkingForm');
    const parkingIdInput = byId('parkingId');
    const parkingNameInput = byId('name');
    const parkingLocationInput = byId('location');
    const totalSpotsInput = byId('totalSpots');
    const availableSpotsInput = byId('availableSpots');
    const pricePerHourInput = byId('pricePerHour');
    const latitudeInput = byId('latitude');
    const longitudeInput = byId('longitude');
    const geocodeLocationBtn = byId('geocodeLocationBtn');
    const geocodeStatus = byId('geocodeStatus');

    const statUsers = byId('statUsers');
    const statUsersInactive = byId('statUsersInactive');
    const statParkings = byId('statParkings');
    const statReservations = byId('statReservations');
    const statRevenue = byId('statRevenue');

    const usersTableBody = byId('usersTableBody');
    const usersResultsCount = byId('usersResultsCount');
    const userSearchInput = byId('userSearchInput');
    const userStatusFilter = byId('userStatusFilter');
    const clearUserFiltersBtn = byId('clearUserFiltersBtn');
    const addUserBtn = byId('addUserBtn');
    const userModal = byId('userModal');
    const userModalTitle = byId('userModalTitle');
    const userForm = byId('userForm');
    const userIdInput = byId('userId');
    const userNameInput = byId('userName');
    const userEmailInput = byId('userEmail');
    const userRoleInput = byId('userRole');
    const userPasswordInput = byId('userPassword');
    const userPasswordHint = byId('userPasswordHint');
    const cancelUserModalBtn = byId('cancelUserModalBtn');

    const reservationsTableBody = byId('reservationsTableBody');

    const exportUsersBtn = byId('exportUsersBtn');
    const exportReservationsBtn = byId('exportReservationsBtn');
    const exportStatsBtn = byId('exportStatsBtn');

    let allParkings = [];
    let visibleParkings = [];
    let allUsers = [];
    let visibleUsers = [];
    let lastGeocodedLocation = '';

    if (userGreeting) {
        userGreeting.textContent = `Bonjour, ${resolveDisplayName(user)}`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../login.html';
        });
    }

    const debouncedParkingFilters = debounce(applyParkingsFilters, 220);
    if (adminSearchInput) adminSearchInput.addEventListener('input', debouncedParkingFilters);
    if (adminAvailabilityFilter) adminAvailabilityFilter.addEventListener('change', applyParkingsFilters);
    if (adminSortFilter) adminSortFilter.addEventListener('change', applyParkingsFilters);
    if (adminMinPriceInput) adminMinPriceInput.addEventListener('input', applyParkingsFilters);
    if (adminMaxPriceInput) adminMaxPriceInput.addEventListener('input', applyParkingsFilters);

    if (adminClearFiltersBtn) {
        adminClearFiltersBtn.addEventListener('click', () => {
            if (adminSearchInput) adminSearchInput.value = '';
            if (adminAvailabilityFilter) adminAvailabilityFilter.value = 'all';
            if (adminSortFilter) adminSortFilter.value = 'nameAsc';
            if (adminMinPriceInput) adminMinPriceInput.value = '';
            if (adminMaxPriceInput) adminMaxPriceInput.value = '';
            applyParkingsFilters();
        });
    }

    if (geocodeLocationBtn) {
        geocodeLocationBtn.addEventListener('click', () => geocodeLocationFromInput(true));
    }

    if (parkingLocationInput) {
        parkingLocationInput.addEventListener('blur', () => {
            if (parkingLocationInput.value.trim()) {
                geocodeLocationFromInput(false);
            }
        });
    }

    if (parkingForm) {
        parkingForm.addEventListener('submit', submitParkingForm);
    }

    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => openUserModal());
    }

    if (cancelUserModalBtn) {
        cancelUserModalBtn.addEventListener('click', closeUserModal);
    }

    if (userForm) {
        userForm.addEventListener('submit', submitUserForm);
    }

    const debouncedUserFilters = debounce(applyUsersFilters, 220);
    if (userSearchInput) userSearchInput.addEventListener('input', debouncedUserFilters);
    if (userStatusFilter) userStatusFilter.addEventListener('change', applyUsersFilters);

    if (clearUserFiltersBtn) {
        clearUserFiltersBtn.addEventListener('click', () => {
            if (userSearchInput) userSearchInput.value = '';
            if (userStatusFilter) userStatusFilter.value = 'all';
            applyUsersFilters();
        });
    }

    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', () => downloadAdminCsv('/exports/users.csv', 'users.csv'));
    }

    if (exportReservationsBtn) {
        exportReservationsBtn.addEventListener('click', () => downloadAdminCsv('/exports/reservations.csv', 'reservations.csv'));
    }

    if (exportStatsBtn) {
        exportStatsBtn.addEventListener('click', () => downloadAdminCsv('/exports/statistics.csv', 'statistics.csv'));
    }

    window.openModal = function() {
        if (!parkingForm || !parkingModal || !modalTitle) return;
        parkingForm.reset();
        if (parkingIdInput) parkingIdInput.value = '';
        modalTitle.textContent = 'Ajouter un Parking';
        updateGeocodeStatus('Entrez une adresse puis cliquez pour remplir latitude/longitude.', 'info');
        lastGeocodedLocation = '';
        parkingModal.classList.remove('hidden');
    };

    window.closeModal = function() {
        if (parkingModal) {
            parkingModal.classList.add('hidden');
        }
    };

    window.editParking = function(id) {
        const parking = allParkings.find((item) => item.id === id);
        if (!parking || !parkingModal || !modalTitle) return;

        if (parkingIdInput) parkingIdInput.value = String(parking.id || '');
        if (parkingNameInput) parkingNameInput.value = parking.name || '';
        if (parkingLocationInput) parkingLocationInput.value = parking.location || '';
        if (totalSpotsInput) totalSpotsInput.value = parking.totalSpots ?? '';
        if (availableSpotsInput) availableSpotsInput.value = parking.availableSpots ?? '';
        if (pricePerHourInput) pricePerHourInput.value = parking.pricePerHour ?? '';
        if (latitudeInput) latitudeInput.value = Number.isFinite(parking.latitude) ? parking.latitude : '';
        if (longitudeInput) longitudeInput.value = Number.isFinite(parking.longitude) ? parking.longitude : '';

        const hasCoordinates = Number.isFinite(parking.latitude) && Number.isFinite(parking.longitude);
        updateGeocodeStatus(
            hasCoordinates
                ? 'Coordonnees chargees. Modifiez la localisation pour les recalculer.'
                : 'Ce parking n a pas de coordonnees. Cliquez sur "Trouver les coordonnees".',
            hasCoordinates ? 'success' : 'error'
        );
        lastGeocodedLocation = normalizeText(parking.location || '');

        modalTitle.textContent = 'Modifier le Parking';
        parkingModal.classList.remove('hidden');
    };

    window.deleteParking = async function(id) {
        if (!confirm('Voulez-vous supprimer ce parking ?')) return;

        try {
            const response = await fetch(`${PARKINGS_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const message = await readErrorMessage(response, 'Impossible de supprimer');
                throw new Error(message);
            }

            showAlert('Parking supprime avec succes.', 'success');
            await loadParkings();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur lors de la suppression.', 'error');
        }
    };

    window.editAppUser = async function(id) {
        try {
            const response = await fetch(`${ADMIN_API}/users/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Utilisateur introuvable'));
            }

            const currentUser = await response.json();
            openUserModal(currentUser);
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateur', 'error');
        }
    };

    window.deleteAppUser = async function(id) {
        if (!confirm('Desactiver cet utilisateur ?')) return;

        try {
            const response = await fetch(`${ADMIN_API}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Desactivation impossible'));
            }

            showAlert('Utilisateur desactive.', 'success');
            await loadUsers();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateur', 'error');
        }
    };

    window.reactivateAppUser = async function(id) {
        if (!confirm('Reactiver cet utilisateur ?')) return;

        try {
            const response = await fetch(`${ADMIN_API}/users/${id}/reactivate`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Reactivation impossible'));
            }

            showAlert('Utilisateur reactive.', 'success');
            await loadUsers();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateur', 'error');
        }
    };

    window.permanentlyDeleteAppUser = async function(id) {
        if (!confirm('Supprimer definitivement cet utilisateur ? Cette action est irreversible.')) return;

        try {
            const response = await fetch(`${ADMIN_API}/users/${id}/permanent`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Suppression definitive impossible'));
            }

            showAlert('Utilisateur supprime definitivement.', 'success');
            await loadUsers();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateur', 'error');
        }
    };

    function parseNullableNumber(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    async function submitParkingForm(event) {
        event.preventDefault();

        const id = parkingIdInput ? parkingIdInput.value : '';
        const name = parkingNameInput ? parkingNameInput.value.trim() : '';
        const location = parkingLocationInput ? parkingLocationInput.value.trim() : '';
        const totalSpots = totalSpotsInput ? Number.parseInt(totalSpotsInput.value, 10) : NaN;
        const availableSpots = availableSpotsInput ? Number.parseInt(availableSpotsInput.value, 10) : NaN;
        const pricePerHour = pricePerHourInput ? Number.parseFloat(pricePerHourInput.value) : NaN;

        let latitude = latitudeInput ? parseNullableNumber(latitudeInput.value) : null;
        let longitude = longitudeInput ? parseNullableNumber(longitudeInput.value) : null;

        if (!name || !location || !Number.isFinite(totalSpots) || !Number.isFinite(availableSpots) || !Number.isFinite(pricePerHour)) {
            showAlert('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

        if (latitude === null || longitude === null) {
            await geocodeLocationFromInput(false);
            latitude = latitudeInput ? parseNullableNumber(latitudeInput.value) : null;
            longitude = longitudeInput ? parseNullableNumber(longitudeInput.value) : null;
        }

        if (latitude === null || longitude === null) {
            showAlert('Latitude et longitude sont obligatoires.', 'error');
            return;
        }

        const payload = {
            name,
            location,
            totalSpots,
            availableSpots,
            pricePerHour,
            latitude,
            longitude
        };

        try {
            const response = await fetch(id ? `${PARKINGS_API}/${id}` : PARKINGS_API, {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Enregistrement impossible'));
            }

            showAlert(id ? 'Parking mis a jour.' : 'Parking ajoute.', 'success');
            window.closeModal();
            await loadParkings();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur lors de lenregistrement.', 'error');
        }
    }

    async function loadParkings() {
        if (loading) {
            loading.classList.remove('hidden');
            loading.textContent = 'Chargement des donnees...';
        }

        try {
            const response = await fetch(PARKINGS_API, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Erreur de chargement'));
            }

            allParkings = await response.json();
            if (loading) loading.classList.add('hidden');
            applyParkingsFilters();
        } catch (error) {
            if (loading) {
                loading.classList.remove('hidden');
                loading.textContent = error.message || 'Erreur lors du chargement des donnees.';
            }
            showAlert(error.message || 'Erreur parkings', 'error');
        }
    }

    function loadAdminFiltersFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (adminSearchInput) adminSearchInput.value = params.get('aq') || '';
        if (adminAvailabilityFilter) adminAvailabilityFilter.value = params.get('aavailability') || 'all';
        if (adminSortFilter) adminSortFilter.value = params.get('asort') || 'nameAsc';
        if (adminMinPriceInput) adminMinPriceInput.value = params.get('aminPrice') || '';
        if (adminMaxPriceInput) adminMaxPriceInput.value = params.get('amaxPrice') || '';
    }

    function updateAdminUrlFromFilters(query, availability, sortBy, minPrice, maxPrice) {
        const params = new URLSearchParams();
        if (query) params.set('aq', query);
        if (availability !== 'all') params.set('aavailability', availability);
        if (sortBy !== 'nameAsc') params.set('asort', sortBy);
        if (minPrice !== null) params.set('aminPrice', String(minPrice));
        if (maxPrice !== null) params.set('amaxPrice', String(maxPrice));

        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
    }

    function applyParkingsFilters() {
        const query = normalizeText(adminSearchInput ? adminSearchInput.value.trim() : '');
        const availability = adminAvailabilityFilter ? adminAvailabilityFilter.value : 'all';
        const sortBy = adminSortFilter ? adminSortFilter.value : 'nameAsc';

        let minPrice = parseNullableNumber(adminMinPriceInput ? adminMinPriceInput.value : '');
        let maxPrice = parseNullableNumber(adminMaxPriceInput ? adminMaxPriceInput.value : '');

        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            const tmp = minPrice;
            minPrice = maxPrice;
            maxPrice = tmp;
        }

        updateAdminUrlFromFilters(query, availability, sortBy, minPrice, maxPrice);

        visibleParkings = allParkings.filter((parking) => {
            const name = normalizeText(parking.name || '');
            const location = normalizeText(parking.location || '');
            const matchesSearch = !query || name.includes(query) || location.includes(query);

            let matchesAvailability = true;
            if (availability === 'available') matchesAvailability = parking.availableSpots > 0;
            if (availability === 'full') matchesAvailability = parking.availableSpots === 0;

            let matchesPrice = true;
            if (minPrice !== null) matchesPrice = parking.pricePerHour >= minPrice;
            if (matchesPrice && maxPrice !== null) matchesPrice = parking.pricePerHour <= maxPrice;

            return matchesSearch && matchesAvailability && matchesPrice;
        });

        visibleParkings.sort((a, b) => {
            if (sortBy === 'priceAsc') return a.pricePerHour - b.pricePerHour;
            if (sortBy === 'priceDesc') return b.pricePerHour - a.pricePerHour;
            if (sortBy === 'availabilityDesc') return b.availableSpots - a.availableSpots;
            return (a.name || '').localeCompare(b.name || '');
        });

        renderParkingsTable();
    }

    function renderParkingsTable() {
        if (!parkingsTableBody) return;

        parkingsTableBody.innerHTML = '';
        if (adminResultsCount) {
            adminResultsCount.classList.remove('hidden');
            adminResultsCount.textContent = `${visibleParkings.length} parking(s) trouve(s)`;
        }

        if (visibleParkings.length === 0) {
            if (emptyMessage) {
                emptyMessage.classList.remove('hidden');
                emptyMessage.textContent = 'Aucun parking ne correspond a vos filtres.';
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        visibleParkings.forEach((parking) => {
            const tr = document.createElement('tr');
            const coordinatesLabel = Number.isFinite(parking.latitude) && Number.isFinite(parking.longitude)
                ? `${parking.latitude.toFixed(5)}, ${parking.longitude.toFixed(5)}`
                : 'Non renseignees';

            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td data-label="Nom" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${parking.name || '-'}</td>
                <td data-label="Localisation" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>${parking.location || '-'}</div>
                    <div class="text-xs text-slate-400 mt-1">${coordinatesLabel}</div>
                </td>
                <td data-label="Places" class="px-6 py-4 whitespace-nowrap text-sm font-bold ${parking.availableSpots === 0 ? 'text-red-600' : 'text-green-600'}">
                    ${parking.availableSpots ?? 0} / ${parking.totalSpots ?? 0}
                </td>
                <td data-label="Prix/h" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${parking.pricePerHour ?? 0} TND</td>
                <td data-label="Actions" class="px-6 py-4 whitespace-nowrap text-sm text-center table-actions">
                    <div class="table-action-group">
                        <button onclick="editParking(${parking.id})" class="btn btn-secondary text-xs">Modifier</button>
                        <button onclick="deleteParking(${parking.id})" class="btn btn-danger text-xs">Supprimer</button>
                    </div>
                </td>
            `;
            parkingsTableBody.appendChild(tr);
        });
    }

    async function geocodeLocationFromInput(forceRefresh) {
        if (!parkingLocationInput || !latitudeInput || !longitudeInput) return false;

        const locationRaw = parkingLocationInput.value.trim();
        const normalizedLocation = normalizeText(locationRaw);

        if (!locationRaw) {
            updateGeocodeStatus('Veuillez saisir une localisation.', 'error');
            return false;
        }

        if (!forceRefresh
            && normalizedLocation === lastGeocodedLocation
            && parseNullableNumber(latitudeInput.value) !== null
            && parseNullableNumber(longitudeInput.value) !== null) {
            return true;
        }

        if (geocodeLocationBtn) {
            geocodeLocationBtn.disabled = true;
            geocodeLocationBtn.textContent = 'Recherche...';
        }
        updateGeocodeStatus('Recherche des coordonnees en cours...', 'info');

        try {
            const result = await geocode(`${locationRaw}, Tunisie`) || await geocode(locationRaw);
            if (!result) {
                updateGeocodeStatus('Adresse non trouvee. Saisissez les coordonnees manuellement.', 'error');
                return false;
            }

            latitudeInput.value = Number(result.lat).toFixed(6);
            longitudeInput.value = Number(result.lon).toFixed(6);
            lastGeocodedLocation = normalizedLocation;
            updateGeocodeStatus('Coordonnees ajoutees automatiquement.', 'success');
            return true;
        } catch (error) {
            updateGeocodeStatus('Geocodage indisponible. Reessayez plus tard.', 'error');
            return false;
        } finally {
            if (geocodeLocationBtn) {
                geocodeLocationBtn.disabled = false;
                geocodeLocationBtn.textContent = 'Trouver les coordonnees';
            }
        }
    }

    async function geocode(query) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
            headers: { 'Accept-Language': 'fr' }
        });

        if (!response.ok) {
            throw new Error('geocode error');
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }

        return data[0];
    }

    function updateGeocodeStatus(message, type) {
        if (!geocodeStatus) return;

        geocodeStatus.textContent = message;
        geocodeStatus.classList.remove('geocode-info', 'geocode-success', 'geocode-error');
        if (type === 'success') geocodeStatus.classList.add('geocode-success');
        else if (type === 'error') geocodeStatus.classList.add('geocode-error');
        else geocodeStatus.classList.add('geocode-info');
    }

    function openUserModal(existingUser) {
        if (!userModal || !userForm || !userModalTitle) return;

        userForm.reset();

        if (existingUser) {
            userModalTitle.textContent = 'Modifier un utilisateur';
            if (userIdInput) userIdInput.value = String(existingUser.id || '');
            if (userNameInput) userNameInput.value = existingUser.name || '';
            if (userEmailInput) userEmailInput.value = existingUser.email || '';
            if (userRoleInput) userRoleInput.value = existingUser.role || 'USER';
            if (userPasswordHint) userPasswordHint.textContent = '(optionnel)';
            if (userPasswordInput) userPasswordInput.required = false;
        } else {
            userModalTitle.textContent = 'Ajouter un utilisateur';
            if (userIdInput) userIdInput.value = '';
            if (userRoleInput) userRoleInput.value = 'USER';
            if (userPasswordHint) userPasswordHint.textContent = '*';
            if (userPasswordInput) userPasswordInput.required = true;
        }

        userModal.classList.remove('hidden');
    }

    function closeUserModal() {
        if (userModal) userModal.classList.add('hidden');
    }

    async function submitUserForm(event) {
        event.preventDefault();

        const id = userIdInput ? userIdInput.value.trim() : '';
        const payload = {
            name: userNameInput ? userNameInput.value.trim() : '',
            email: userEmailInput ? userEmailInput.value.trim() : '',
            role: userRoleInput ? userRoleInput.value : 'USER'
        };
        const password = userPasswordInput ? userPasswordInput.value.trim() : '';

        if (!payload.name || !payload.email || !payload.role) {
            showAlert('Nom, email et role sont obligatoires.', 'error');
            return;
        }

        if (id) {
            if (password) payload.password = password;
        } else {
            if (!password) {
                showAlert('Le mot de passe est obligatoire pour creer un utilisateur.', 'error');
                return;
            }
            payload.password = password;
        }

        try {
            const response = await fetch(id ? `${ADMIN_API}/users/${id}` : `${ADMIN_API}/users`, {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, id ? 'Mise a jour impossible' : 'Creation impossible'));
            }

            showAlert(id ? 'Utilisateur mis a jour.' : 'Utilisateur cree avec succes.', 'success');
            closeUserModal();
            await loadUsers();
            await loadStatistics();
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateur', 'error');
        }
    }

    function applyUsersFilters() {
        const query = normalizeText(userSearchInput ? userSearchInput.value.trim() : '');
        const status = userStatusFilter ? userStatusFilter.value : 'all';

        visibleUsers = allUsers.filter((currentUser) => {
            const name = normalizeText(currentUser.name || '');
            const email = normalizeText(currentUser.email || '');
            const isActive = currentUser.active !== false;

            const matchesSearch = !query || name.includes(query) || email.includes(query);
            const matchesStatus = status === 'all'
                || (status === 'active' && isActive)
                || (status === 'inactive' && !isActive);

            return matchesSearch && matchesStatus;
        });

        renderUsersTable();
    }

    function renderUsersTable() {
        if (!usersTableBody) return;

        usersTableBody.innerHTML = '';
        if (usersResultsCount) {
            usersResultsCount.textContent = `${visibleUsers.length} utilisateur(s) affiche(s)`;
        }

        visibleUsers.forEach((currentUser) => {
            const isActive = currentUser.active !== false;
            const actionButtons = isActive
                ? `
                    <button onclick="editAppUser(${currentUser.id})" class="user-action-btn user-action-edit">Modifier</button>
                    <button onclick="deleteAppUser(${currentUser.id})" class="user-action-btn user-action-warning">Desactiver</button>
                    <button onclick="permanentlyDeleteAppUser(${currentUser.id})" class="user-action-btn user-action-danger">Suppr. definitive</button>
                `
                : `
                    <button onclick="reactivateAppUser(${currentUser.id})" class="user-action-btn user-action-success">Reactiver</button>
                    <button onclick="permanentlyDeleteAppUser(${currentUser.id})" class="user-action-btn user-action-danger">Suppr. definitive</button>
                `;

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50';
            tr.innerHTML = `
                <td data-label="Nom" class="px-4 py-2 text-sm">${currentUser.name || '-'}</td>
                <td data-label="Email" class="px-4 py-2 text-sm">${currentUser.email || '-'}</td>
                <td data-label="Role" class="px-4 py-2 text-sm">${currentUser.role || '-'}</td>
                <td data-label="Statut" class="px-4 py-2 text-sm">
                    <span class="${isActive ? 'pill pill-success' : 'pill pill-danger'}">${isActive ? 'Actif' : 'Inactif'}</span>
                </td>
                <td data-label="Actions" class="px-4 py-2 text-right text-sm table-actions">
                    <div class="table-action-group">${actionButtons}</div>
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        if (statUsers) {
            statUsers.textContent = String(allUsers.length);
        }
        if (statUsersInactive) {
            const inactiveCount = allUsers.filter((entry) => entry.active === false).length;
            statUsersInactive.textContent = `${inactiveCount} inactif(s)`;
        }
    }

    async function loadUsers() {
        try {
            const response = await fetch(`${ADMIN_API}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Chargement des utilisateurs impossible'));
            }

            allUsers = await response.json();
            applyUsersFilters();
        } catch (error) {
            showAlert(error.message || 'Erreur utilisateurs', 'error');
        }
    }

    async function loadReservations() {
        if (!reservationsTableBody) return;

        try {
            const response = await fetch(`${ADMIN_API}/reservations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Chargement des reservations impossible'));
            }

            const reservations = await response.json();
            reservationsTableBody.innerHTML = '';

            reservations.forEach((reservation) => {
                const status = reservation.status || '-';
                const statusClass = status === 'CONFIRMED'
                    ? 'pill pill-success'
                    : (status === 'PENDING' ? 'pill pill-warning' : 'pill pill-danger');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Utilisateur" class="px-4 py-2 text-sm">${reservation.user ? reservation.user.email : '-'}</td>
                    <td data-label="Parking" class="px-4 py-2 text-sm">${reservation.parking ? reservation.parking.name : '-'}</td>
                    <td data-label="Debut" class="px-4 py-2 text-sm">${reservation.startTime ? new Date(reservation.startTime).toLocaleString() : '-'}</td>
                    <td data-label="Fin" class="px-4 py-2 text-sm">${reservation.endTime ? new Date(reservation.endTime).toLocaleString() : '-'}</td>
                    <td data-label="Statut" class="px-4 py-2 text-sm"><span class="${statusClass}">${status}</span></td>
                `;
                reservationsTableBody.appendChild(tr);
            });
        } catch (error) {
            showAlert(error.message || 'Erreur reservations', 'error');
        }
    }

    async function loadStatistics() {
        try {
            const response = await fetch(`${ADMIN_API}/statistics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Chargement des statistiques impossible'));
            }

            const stats = await response.json();
            if (statUsers && Number.isFinite(stats.totalUsers)) statUsers.textContent = String(stats.totalUsers);
            if (statUsersInactive && Number.isFinite(stats.inactiveUsers)) statUsersInactive.textContent = `${stats.inactiveUsers} inactif(s)`;
            if (statParkings) statParkings.textContent = String(Number.isFinite(stats.totalParkings) ? stats.totalParkings : allParkings.length);
            if (statReservations && Number.isFinite(stats.totalReservations)) statReservations.textContent = String(stats.totalReservations);
            if (statRevenue && Number.isFinite(stats.totalRevenue)) statRevenue.textContent = `${stats.totalRevenue.toFixed(2)} TND`;
        } catch (error) {
            if (statParkings) statParkings.textContent = String(allParkings.length);
            showAlert(error.message || 'Erreur statistiques', 'error');
        }
    }

    async function downloadAdminCsv(endpoint, fallbackFileName) {
        try {
            const response = await fetch(`${ADMIN_API}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Export impossible'));
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition') || '';
            const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
            const fileName = filenameMatch ? filenameMatch[1].replace(/"/g, '') : fallbackFileName;

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);

            showAlert(`Export termine: ${fileName}`, 'success');
        } catch (error) {
            showAlert(error.message || 'Export impossible', 'error');
        }
    }

    async function readErrorMessage(response, fallbackMessage) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                const body = await response.json();
                return body.message || fallbackMessage;
            } catch (error) {
                return fallbackMessage;
            }
        }

        try {
            const rawText = (await response.text()).trim();
            return rawText || fallbackMessage;
        } catch (error) {
            return fallbackMessage;
        }
    }

    function showAlert(message, type) {
        if (!alertMessage) return;

        alertMessage.textContent = message;
        alertMessage.className = type === 'success' ? 'alert-box alert-success mb-4' : 'alert-box alert-error mb-4';
        alertMessage.classList.remove('hidden');

        window.setTimeout(() => {
            alertMessage.classList.add('hidden');
        }, 4500);
    }

    function normalizeText(text) {
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function resolveDisplayName(currentUser) {
        const rawName = (currentUser && typeof currentUser.name === 'string') ? currentUser.name.trim() : '';
        if (rawName) return rawName;

        const rawEmail = (currentUser && typeof currentUser.email === 'string') ? currentUser.email.trim() : '';
        if (rawEmail.includes('@')) {
            const emailPrefix = rawEmail.split('@')[0].replace(/[._-]+/g, ' ').trim();
            if (emailPrefix) return emailPrefix;
        }

        return 'Admin';
    }

    function debounce(fn, delayMs) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delayMs);
        };
    }

    loadAdminFiltersFromUrl();
    loadParkings();
    loadStatistics();
    loadUsers();
    loadReservations();
});