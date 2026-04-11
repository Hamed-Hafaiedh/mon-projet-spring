// Exécuté sur chaque page pour vérifier l'état de connexion et adapter les menus

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.getElementById('nav-links');
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch(e) {
            console.error('Erreur parsing user:', e);
        }
    }

    if (navLinks) {
        if (user && token) {
            // Utilisateur connecté
            if (user.role === 'ADMIN') {
                navLinks.innerHTML = `
                    <button type="button" class="btn btn-secondary text-sm" data-theme-toggle aria-pressed="false">Mode sombre</button>
                    <button onclick="logout()" class="btn btn-danger text-white px-4 py-2 font-semibold transition duration-300">Déconnexion</button>
                `;
            } else {
                navLinks.innerHTML = `
                    <a href="parkings.html" class="nav-action-link">Réserver</a>
                    <a href="mes-reservations.html" class="nav-action-link">Mes Réservations</a>
                    <button type="button" class="btn btn-secondary text-sm" data-theme-toggle aria-pressed="false">Mode sombre</button>
                    <button onclick="logout()" class="btn btn-danger text-white px-4 py-2 font-semibold transition duration-300">Déconnexion</button>
                `;
            }
        } else {
            navLinks.innerHTML = `
                <button type="button" class="btn btn-secondary text-sm" data-theme-toggle aria-pressed="false">Mode sombre</button>
                <a href="login.html" class="nav-action-link">Connexion</a>
                <a href="register.html" class="nav-action-link">S'inscrire</a>
            `;
        }
    }

            if (window.ThemeManager && typeof window.ThemeManager.bindThemeToggleButtons === 'function') {
                window.ThemeManager.bindThemeToggleButtons(navLinks);
            }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}