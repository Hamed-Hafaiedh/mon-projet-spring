document.addEventListener('DOMContentLoaded', () => {
    const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:8080/api';
    let allParkings = [];
    let userPosition = null;
    let map = null;
    let mapLayerGroup = null;
    let lightTileLayer = null;
    let activeTileLayer = null;
    let isGeolocationInProgress = false;
    let autoRefreshTimer = null;
    let latestMapBounds = null;
    const AUTO_REFRESH_MS = 15000;
    const DEFAULT_MAP_CENTER = [36.8065, 10.1815];
    const THEME_KEY = 'parkings_theme';

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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    const searchInput = document.getElementById('searchInput');
    const availabilityFilter = document.getElementById('availabilityFilter');
    const sortFilter = document.getElementById('sortFilter');
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');
    const maxDistanceInput = document.getElementById('maxDistanceInput');
    const activeFilters = document.getElementById('activeFilters');
    const pricePresetButtons = document.querySelectorAll('.price-preset-btn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const locateMeBtn = document.getElementById('locateMeBtn');
    const recenterUserBtn = document.getElementById('recenterUserBtn');
    const fitAllBtn = document.getElementById('fitAllBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const locationStatus = document.getElementById('locationStatus');
    const gpsBadge = document.getElementById('gpsBadge');
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const filtersPanel = document.getElementById('filtersPanel');

    initMap();
    initTheme();

    if (toggleFiltersBtn && filtersPanel) {
        const syncMobileFiltersState = () => {
            if (window.innerWidth > 768) {
                filtersPanel.classList.remove('is-open');
                toggleFiltersBtn.setAttribute('aria-expanded', 'false');
                toggleFiltersBtn.textContent = 'Afficher les filtres';
                return;
            }

            const isOpen = filtersPanel.classList.contains('is-open');
            toggleFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            toggleFiltersBtn.textContent = isOpen ? 'Masquer les filtres' : 'Afficher les filtres';
        };

        toggleFiltersBtn.addEventListener('click', () => {
            filtersPanel.classList.toggle('is-open');
            syncMobileFiltersState();
        });

        window.addEventListener('resize', syncMobileFiltersState);
        syncMobileFiltersState();
    }

    loadFiltersFromUrl();

    const debouncedApply = debounce(applyFiltersAndRender, 220);
    if (searchInput) searchInput.addEventListener('input', debouncedApply);
    if (availabilityFilter) availabilityFilter.addEventListener('change', applyFiltersAndRender);
    if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndRender);
    if (minPriceInput) minPriceInput.addEventListener('input', applyFiltersAndRender);
    if (maxPriceInput) maxPriceInput.addEventListener('input', applyFiltersAndRender);
    if (maxDistanceInput) maxDistanceInput.addEventListener('input', applyFiltersAndRender);

    pricePresetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (minPriceInput) minPriceInput.value = button.dataset.min || '';
            if (maxPriceInput) maxPriceInput.value = button.dataset.max || '';
            applyFiltersAndRender();
        });
    });

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (availabilityFilter) availabilityFilter.value = 'all';
            if (sortFilter) sortFilter.value = 'nameAsc';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            if (maxDistanceInput) maxDistanceInput.value = '';
            applyFiltersAndRender();
        });
    }

    if (locateMeBtn) {
        locateMeBtn.addEventListener('click', askForUserLocation);
    }

    if (recenterUserBtn) {
        recenterUserBtn.addEventListener('click', recenterOnUser);
    }

    if (fitAllBtn) {
        fitAllBtn.addEventListener('click', fitAllParkings);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    setGpsState('inactive', 'GPS inactif');

    async function fetchParkings() {
        const loader = document.getElementById('loader');
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch(`${API_URL}/parkings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Erreur lors de la recuperation des donnees.');
            }

            allParkings = await response.json();
            if (loader) loader.classList.add('hidden');
            applyFiltersAndRender();
            tryAutoLocateUser();
            setupAutoRefresh();
        } catch (error) {
            if (loader) loader.classList.add('hidden');
            if (errorMessage) {
                errorMessage.textContent = 'Impossible de charger les parkings. Verifiez votre connexion au serveur.';
                errorMessage.classList.remove('hidden');
            }
            console.error('Erreur:', error);
        }
    }

    function applyFiltersAndRender() {
        const query = normalizeText((searchInput ? searchInput.value : '').trim());
        const availability = availabilityFilter ? availabilityFilter.value : 'all';
        const sortBy = sortFilter ? sortFilter.value : 'nameAsc';
        let minPrice = parseFloat(minPriceInput ? minPriceInput.value : '');
        let maxPrice = parseFloat(maxPriceInput ? maxPriceInput.value : '');
        let maxDistance = parseFloat(maxDistanceInput ? maxDistanceInput.value : '');

        minPrice = Number.isFinite(minPrice) ? minPrice : null;
        maxPrice = Number.isFinite(maxPrice) ? maxPrice : null;
        maxDistance = Number.isFinite(maxDistance) && maxDistance > 0 ? maxDistance : null;

        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            const temp = minPrice;
            minPrice = maxPrice;
            maxPrice = temp;
        }

        if (sortBy === 'distanceAsc' && !userPosition && locationStatus) {
            locationStatus.textContent = 'Activez votre position pour trier par distance.';
            setGpsState('inactive', 'GPS requis');
        }

        updateUrlFromFilters(query, availability, sortBy, minPrice, maxPrice, maxDistance);

        const withDistance = allParkings.map(parking => {
            const hasCoordinates = Number.isFinite(parking.latitude) && Number.isFinite(parking.longitude);
            const distanceKm = (userPosition && hasCoordinates)
                ? calculateDistanceKm(userPosition.latitude, userPosition.longitude, parking.latitude, parking.longitude)
                : null;
            return { ...parking, distanceKm };
        });

        let filtered = withDistance.filter(parking => {
            const name = normalizeText(parking.name || '');
            const location = normalizeText(parking.location || '');
            const matchesSearch = !query || name.includes(query) || location.includes(query);

            let matchesAvailability = true;
            if (availability === 'available') {
                matchesAvailability = parking.availableSpots > 0;
            } else if (availability === 'full') {
                matchesAvailability = parking.availableSpots === 0;
            }

            let matchesPrice = true;
            if (minPrice !== null) matchesPrice = parking.pricePerHour >= minPrice;
            if (matchesPrice && maxPrice !== null) matchesPrice = parking.pricePerHour <= maxPrice;

            let matchesDistance = true;
            if (maxDistance !== null) {
                matchesDistance = parking.distanceKm !== null && parking.distanceKm <= maxDistance;
            }

            return matchesSearch && matchesAvailability && matchesPrice && matchesDistance;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'priceAsc') return a.pricePerHour - b.pricePerHour;
            if (sortBy === 'priceDesc') return b.pricePerHour - a.pricePerHour;
            if (sortBy === 'availabilityDesc') return b.availableSpots - a.availableSpots;
            if (sortBy === 'distanceAsc') {
                const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY;
                const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY;
                return distanceA - distanceB;
            }
            return (a.name || '').localeCompare(b.name || '');
        });

        syncPresetButtons(minPrice, maxPrice);
        renderActiveFilters(query, availability, sortBy, minPrice, maxPrice, maxDistance);
        renderParkings(filtered);
        updateMap(filtered);
    }

    function loadFiltersFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (searchInput) searchInput.value = params.get('q') || '';
        if (availabilityFilter) availabilityFilter.value = params.get('availability') || 'all';
        if (sortFilter) sortFilter.value = params.get('sort') || 'nameAsc';
        if (minPriceInput) minPriceInput.value = params.get('minPrice') || '';
        if (maxPriceInput) maxPriceInput.value = params.get('maxPrice') || '';
        if (maxDistanceInput) maxDistanceInput.value = params.get('maxDistance') || '';
    }

    function updateUrlFromFilters(query, availability, sortBy, minPrice, maxPrice, maxDistance) {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (availability !== 'all') params.set('availability', availability);
        if (sortBy !== 'nameAsc') params.set('sort', sortBy);
        if (minPrice !== null) params.set('minPrice', String(minPrice));
        if (maxPrice !== null) params.set('maxPrice', String(maxPrice));
        if (maxDistance !== null) params.set('maxDistance', String(maxDistance));

        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
    }

    function renderParkings(parkings) {
        const parkingsGrid = document.getElementById('parkingsGrid');
        const emptyMessage = document.getElementById('emptyMessage');
        const resultsCount = document.getElementById('resultsCount');

        if (!parkingsGrid || !emptyMessage || !resultsCount) {
            return;
        }

        parkingsGrid.innerHTML = '';
        resultsCount.classList.remove('hidden');
        resultsCount.textContent = `${parkings.length} resultat(s) sur ${allParkings.length} parking(s)`;

        if (parkings.length === 0) {
            parkingsGrid.classList.add('hidden');
            emptyMessage.textContent = 'Aucun parking ne correspond a votre recherche.';
            emptyMessage.classList.remove('hidden');
            return;
        }

        emptyMessage.classList.add('hidden');
        parkingsGrid.classList.remove('hidden');

        parkings.forEach(parking => {
            const isFull = parking.availableSpots === 0;
            const distanceHtml = parking.distanceKm !== null
                ? `<p class="text-xs text-slate-500 mb-2">Distance: ${parking.distanceKm.toFixed(2)} km</p>`
                : '';

            const card = document.createElement('div');
            card.className = `parking-card overflow-hidden transition-transform transform hover:-translate-y-1 ${isFull ? 'opacity-75' : ''}`;
            card.innerHTML = `
                <div class="p-5">
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h2 class="text-xl font-bold text-gray-900">${parking.name}</h2>
                        <span class="font-bold text-indigo-600 sm:text-right">${parking.pricePerHour} TND / h</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">📍 ${parking.location}</p>
                    ${distanceHtml}
                    <div class="mb-3">
                        <span class="text-sm font-medium ${isFull ? 'text-red-500' : 'text-green-600'} flex items-center">
                            <span class="mr-1 w-2 h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'}"></span>
                            ${parking.availableSpots} / ${parking.totalSpots} places disponibles
                        </span>
                    </div>
                    <div class="mt-5">
                        <button onclick="reserver(${parking.id})" class="w-full btn font-bold py-2 px-4 ${isFull ? 'bg-gray-400 text-white cursor-not-allowed' : 'btn-primary'}" ${isFull ? 'disabled' : ''}>
                            ${isFull ? 'Complet' : 'Reserver une place'}
                        </button>
                    </div>
                </div>
            `;
            parkingsGrid.appendChild(card);
        });
    }

    function renderActiveFilters(query, availability, sortBy, minPrice, maxPrice, maxDistance) {
        if (!activeFilters) return;

        activeFilters.innerHTML = '';
        const chips = [];

        if (query && searchInput) chips.push(`Recherche: ${searchInput.value.trim()}`);
        if (availability === 'available') chips.push('Disponibilite: disponibles');
        if (availability === 'full') chips.push('Disponibilite: complets');
        if (minPrice !== null) chips.push(`Prix min: ${minPrice} TND`);
        if (maxPrice !== null) chips.push(`Prix max: ${maxPrice} TND`);
        if (maxDistance !== null) chips.push(`Distance max: ${maxDistance} km`);

        if (sortBy !== 'nameAsc') {
            const labelMap = {
                priceAsc: 'Tri: prix croissant',
                priceDesc: 'Tri: prix decroissant',
                availabilityDesc: 'Tri: disponibilite',
                distanceAsc: 'Tri: distance'
            };
            chips.push(labelMap[sortBy] || 'Tri personnalise');
        }

        chips.forEach(text => {
            const chip = document.createElement('span');
            chip.className = 'filter-chip';
            chip.textContent = text;
            activeFilters.appendChild(chip);
        });
    }

    function syncPresetButtons(minPrice, maxPrice) {
        pricePresetButtons.forEach(button => {
            const min = button.dataset.min === '' ? null : parseFloat(button.dataset.min);
            const max = button.dataset.max === '' ? null : parseFloat(button.dataset.max);
            button.classList.toggle('active', min === minPrice && max === maxPrice);
        });
    }

    function initMap() {
        const mapContainer = document.getElementById('parkingsMap');
        if (!mapContainer) return;

        if (typeof L === 'undefined') {
            mapContainer.innerHTML = '<div class="p-4 text-sm text-slate-700">Carte indisponible (connexion internet ou CDN bloque). Vous pouvez quand meme utiliser la liste et les filtres.</div>';
            mapContainer.classList.add('grid', 'place-items-center');
            if (locationStatus) {
                locationStatus.textContent = 'La librairie de carte ne s est pas chargee. Verifiez votre connexion internet.';
            }
            setGpsState('error', 'Carte indisponible');
            return;
        }

        map = L.map(mapContainer).setView(DEFAULT_MAP_CENTER, 11);

        lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        });

        activeTileLayer = lightTileLayer;
        activeTileLayer.addTo(map);
        mapLayerGroup = L.layerGroup().addTo(map);

        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
            const container = L.DomUtil.create('div', 'map-legend');
            container.innerHTML = `
                <div class="map-legend-title">Legende</div>
                <div class="map-legend-item"><span class="map-dot map-dot-available"></span> Parking disponible</div>
                <div class="map-legend-item"><span class="map-dot map-dot-full"></span> Parking complet</div>
                <div class="map-legend-item"><span class="map-dot map-dot-user"></span> Votre position</div>
            `;
            return container;
        };
        legend.addTo(map);
    }

    function updateMap(parkings) {
        if (!map || !mapLayerGroup) return;

        mapLayerGroup.clearLayers();
        const bounds = [];

        parkings.forEach(parking => {
            if (!Number.isFinite(parking.latitude) || !Number.isFinite(parking.longitude)) return;

            const marker = L.marker([parking.latitude, parking.longitude], {
                icon: createParkingMarkerIcon(parking.availableSpots > 0)
            });
            const distanceLabel = parking.distanceKm !== null
                ? `<br><strong>Distance:</strong> ${parking.distanceKm.toFixed(2)} km`
                : '';
            const itineraryLink = userPosition
                ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${userPosition.latitude},${userPosition.longitude}`)}&destination=${encodeURIComponent(`${parking.latitude},${parking.longitude}`)}&travelmode=driving`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${parking.latitude},${parking.longitude}`)}`;
            marker.bindPopup(`
                <strong>${parking.name}</strong><br>
                ${parking.location}
                ${distanceLabel}
                <br><a href="${itineraryLink}" target="_blank" rel="noopener noreferrer">Ouvrir l itineraire</a>
            `);
            marker.addTo(mapLayerGroup);
            bounds.push([parking.latitude, parking.longitude]);
        });

        if (userPosition) {
            L.marker([userPosition.latitude, userPosition.longitude], {
                icon: createUserMarkerIcon()
            }).bindPopup('Votre position').addTo(mapLayerGroup);
            bounds.push([userPosition.latitude, userPosition.longitude]);
        }

        if (bounds.length > 0) {
            latestMapBounds = bounds;
            map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        } else {
            latestMapBounds = null;
        }
    }

    function recenterOnUser() {
        if (!map) return;

        if (userPosition) {
            map.setView([userPosition.latitude, userPosition.longitude], 14, { animate: true });
            if (locationStatus) {
                locationStatus.textContent = 'Carte recentee sur votre position.';
            }
            return;
        }

        if (locationStatus) {
            locationStatus.textContent = 'Position non disponible. Cliquez sur "Utiliser ma position".';
        }
        setGpsState('inactive', 'GPS requis');
    }

    function fitAllParkings() {
        if (!map) return;

        if (latestMapBounds && latestMapBounds.length > 0) {
            map.fitBounds(latestMapBounds, { padding: [35, 35], maxZoom: 14, animate: true });
            return;
        }

        map.setView(DEFAULT_MAP_CENTER, 11, { animate: true });
    }

    function askForUserLocation() {
        if (isGeolocationInProgress) return;
        if (!locationStatus) return;

        if (!window.isSecureContext) {
            locationStatus.textContent = 'La geolocalisation exige un contexte securise. Ouvrez via http://localhost:5500 (pas file://).';
            setGpsState('error', 'Contexte non securise');
            fallbackFromDistanceFilters();
            return;
        }

        if (!navigator.geolocation) {
            locationStatus.textContent = 'La geolocalisation n est pas supportee sur ce navigateur.';
            setGpsState('error', 'GPS non supporte');
            fallbackFromDistanceFilters();
            return;
        }

        locationStatus.textContent = 'Detection de votre position...';
        setGpsState('inactive', 'Recherche GPS...');
        isGeolocationInProgress = true;
        navigator.geolocation.getCurrentPosition(async position => {
            userPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            locationStatus.textContent = `Position detectee: ${userPosition.latitude.toFixed(4)}, ${userPosition.longitude.toFixed(4)}`;
            setGpsState('active', 'GPS actif');
            await fetchNearbyHint(userPosition.latitude, userPosition.longitude);
            applyFiltersAndRender();
            isGeolocationInProgress = false;
        }, error => {
            userPosition = null;
            if (error && error.code === 1) {
                locationStatus.textContent = 'Permission refusee. Autorisez la localisation puis reessayez.';
                setGpsState('error', 'Permission refusee');
            } else if (error && error.code === 2) {
                locationStatus.textContent = 'Position indisponible. Verifiez GPS/reseau puis reessayez.';
                setGpsState('error', 'Position indisponible');
            } else if (error && error.code === 3) {
                locationStatus.textContent = 'Timeout geolocalisation. Reessayez.';
                setGpsState('error', 'Timeout GPS');
            } else {
                locationStatus.textContent = 'Impossible de recuperer votre position.';
                setGpsState('error', 'Erreur GPS');
            }

            fallbackFromDistanceFilters();
            isGeolocationInProgress = false;
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        });
    }

    async function tryAutoLocateUser() {
        if (!locationStatus) {
            return;
        }

        if (!window.isSecureContext) {
            locationStatus.textContent = 'GPS bloque: ouvrez le site via http://localhost:5500 ou en HTTPS.';
            setGpsState('error', 'Contexte non securise');
            return;
        }

        if (!navigator.geolocation) {
            locationStatus.textContent = 'GPS non supporte par ce navigateur.';
            setGpsState('error', 'GPS non supporte');
            return;
        }

        // Evite de redemander la geolocalisation a chaque refresh pendant la meme session.
        if (sessionStorage.getItem('geo_autolocate_attempted') === '1') {
            return;
        }
        sessionStorage.setItem('geo_autolocate_attempted', '1');

        if (typeof navigator.permissions !== 'undefined' && navigator.permissions.query) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                if (permission.state === 'denied') {
                    locationStatus.textContent = 'Geolocalisation refusee. Utilisez la recherche manuelle ou autorisez la localisation.';
                    setGpsState('error', 'GPS refuse');
                    return;
                }
            } catch (error) {
                // Certains navigateurs n exposent pas cette permission de facon standard.
            }
        }

        askForUserLocation();
    }

    function fallbackFromDistanceFilters() {
        if (sortFilter && sortFilter.value === 'distanceAsc') {
            sortFilter.value = 'nameAsc';
        }
        if (maxDistanceInput && maxDistanceInput.value) {
            maxDistanceInput.value = '';
        }
        applyFiltersAndRender();
    }

    function setGpsState(state, label) {
        if (!gpsBadge) return;

        gpsBadge.textContent = label;
        gpsBadge.classList.remove('gps-active', 'gps-inactive', 'gps-error');
        if (state === 'active') {
            gpsBadge.classList.add('gps-active');
        } else if (state === 'error') {
            gpsBadge.classList.add('gps-error');
        } else {
            gpsBadge.classList.add('gps-inactive');
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        applyTheme(initialTheme);
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        applyTheme(isDark ? 'light' : 'dark');
    }

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('theme-dark', isDark);
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        if (themeToggleBtn) {
            themeToggleBtn.textContent = isDark ? 'Mode clair' : 'Mode sombre';
        }
        updateMapTileTheme(isDark);
    }

    function updateMapTileTheme(isDark) {
        if (!map || !lightTileLayer) {
            return;
        }

        const nextLayer = lightTileLayer;
        if (activeTileLayer === nextLayer) {
            return;
        }

        if (activeTileLayer) {
            map.removeLayer(activeTileLayer);
        }
        activeTileLayer = nextLayer;
        activeTileLayer.addTo(map);
    }

    function createParkingMarkerIcon(isAvailable) {
        const statusClass = isAvailable ? 'parking-marker-available' : 'parking-marker-full';
        return L.divIcon({
            className: 'parking-marker-wrapper',
            html: `<div class="parking-marker ${statusClass}">🅿</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -14]
        });
    }

    function createUserMarkerIcon() {
        return L.divIcon({
            className: 'parking-marker-wrapper',
            html: '<div class="parking-marker parking-marker-user">📍</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -14]
        });
    }

    function setupAutoRefresh() {
        if (autoRefreshTimer) {
            return;
        }

        autoRefreshTimer = setInterval(() => {
            fetchParkings();
        }, AUTO_REFRESH_MS);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                fetchParkings();
            }
        });

        window.addEventListener('focus', () => {
            fetchParkings();
        });
    }

    async function fetchNearbyHint(latitude, longitude) {
        try {
            const response = await fetch(`${API_URL}/parkings/nearby?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&limit=3&availableOnly=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;
            const nearby = await response.json();
            if (Array.isArray(nearby) && nearby.length > 0 && locationStatus) {
                locationStatus.textContent = `${nearby.length} parking(s) proche(s) trouve(s). Activez le tri Distance.`;
            }
        } catch (error) {
            console.error('Erreur recuperation parkings proches:', error);
        }
    }

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const earthRadiusKm = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    function toRadians(value) {
        return (value * Math.PI) / 180;
    }

    function normalizeText(text) {
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function debounce(fn, delayMs) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delayMs);
        };
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

    fetchParkings();
});

function reserver(parkingId) {
    window.location.href = `reserver.html?parkingId=${parkingId}`;
}