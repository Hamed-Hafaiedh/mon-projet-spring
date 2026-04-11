# Parking Location - Demarrage rapide

## 1) Comment lancer le projet (Windows PowerShell)

### Prerequis
- Java 17+
- MySQL demarre en local
- Python 3 (pour servir le frontend statique)

> Config DB actuelle: `src/main/resources/application.properties`
> - URL: `jdbc:mysql://localhost:3306/parking_location?createDatabaseIfNotExist=true&serverTimezone=UTC`
> - User: `root`
> - Password: `Mysql123a`

### Lancer le backend (Spring Boot)
```powershell
Set-Location "C:\Users\DELL\Desktop\parking-location"
.\mvnw.cmd spring-boot:run
```

Backend API: `http://localhost:8080`

### Lancer le frontend (HTML/JS)
```powershell
Set-Location "C:\Users\DELL\Desktop\parking-location\frontend"
python -m http.server 5500
```

Frontend: `http://localhost:5500/login.html`

Si le port `5500` est occupe, utilisez un autre port (ex: `5501`).

---

## 2) Comptes de test

### Admin (cree automatiquement au demarrage)
- Email: `admin@parking.com`
- Mot de passe: `password123`
- Role: `ADMIN`

### Utilisateur standard
- Creez-le via la page `register.html` ou via `POST /api/auth/register`
- Role assigne automatiquement: `USER`

---

## 3) Endpoints Admin principaux

Base URL: `http://localhost:8080/api/admin`

> Tous ces endpoints necessitent un token JWT d'un compte `ADMIN` dans le header:
> `Authorization: Bearer <token>`

- `GET /users` : liste des utilisateurs
- `GET /users/{id}` : detail d'un utilisateur
- `POST /users` : creation utilisateur
- `PUT /users/{id}` : modification utilisateur
- `DELETE /users/{id}` : desactivation (soft delete, `active=false`)
- `PATCH /users/{id}/reactivate` : reactivation utilisateur
- `DELETE /users/{id}/permanent` : suppression definitive (compte inactif requis)
- `GET /reservations` : reservations globales
- `GET /statistics` : statistiques dashboard
- `GET /exports/users.csv` : export CSV des utilisateurs
- `GET /exports/reservations.csv` : export CSV des reservations
- `GET /exports/statistics.csv` : export CSV des statistiques

---

## 4) Endpoints Auth utiles

Base URL: `http://localhost:8080/api/auth`

- `POST /register`
- `POST /login`

---

## 5) Recherche de parkings proches (Map)

Endpoint: `GET /api/parkings/nearby`

Parametres query:
- `lat` (obligatoire): latitude utilisateur
- `lng` (obligatoire): longitude utilisateur
- `radiusKm` (optionnel): rayon max en km
- `limit` (optionnel): nombre max de resultats (1..100)
- `availableOnly` (optionnel): `true` pour uniquement les parkings avec places dispo

Exemple:
`/api/parkings/nearby?lat=36.8065&lng=10.1815&radiusKm=8&limit=10&availableOnly=true`

Notes:
- La page `parkings.html` propose un bouton "Utiliser ma position" pour activer la geolocalisation.
- Le tri "Distance (plus proche)" devient utile apres detection de position.
- Les coordonnees d'un parking se gerent dans `admin/dashboard.html` (Latitude/Longitude).

---

## 6) Verification rapide
## 5) Verification rapide

1. Connectez-vous avec `admin@parking.com` / `password123`
2. Ouvrez `admin/dashboard.html`
3. Testez:
   - creation/modification utilisateur via modal
   - desactivation/reactivation utilisateur
   - filtre utilisateurs (recherche + statut)
   - CRUD parking + statistiques


