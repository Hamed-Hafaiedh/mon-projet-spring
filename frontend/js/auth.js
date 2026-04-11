const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:8080/api';

// Récupération des formulaires
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// ==============================
// GESTION DU LOGIN
// ==============================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorMessage');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                // Sauvegarde du token et infos utilisateur dans le LocalStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
                
                // Redirection selon le rôle
                if (data.role === 'ADMIN') {
                    window.location.href = 'admin/dashboard.html';
                } else {
                    window.location.href = 'parkings.html';
                }
            } else {
                errorDiv.textContent = "Email ou mot de passe incorrect.";
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = "Erreur de connexion au serveur.";
            errorDiv.classList.remove('hidden');
        }
    });
}

// ==============================
// GESTION DE L'INSCRIPTION
// ==============================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            if (response.ok) {
                errorDiv.classList.add('hidden');
                successDiv.classList.remove('hidden');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                const errorData = await response.json();
                errorDiv.textContent = errorData.message || "Erreur lors de l'inscription.";
                errorDiv.classList.remove('hidden');
                successDiv.classList.add('hidden');
            }
        } catch (error) {
            errorDiv.textContent = "Erreur de connexion au serveur.";
            errorDiv.classList.remove('hidden');
        }
    });
}

// Fonction utilitaire pour se déconnecter
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}