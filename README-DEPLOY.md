# Parking Location - Build & Deployment

Ce fichier contient les commandes pour construire et déployer l'application (backend + frontend intégrés).

Prerequisites
- Java 17 ou 21 (JRE/JDK)
- Maven
- Docker (optionnel)

Build local (inclut copie frontend -> resources/static):

```powershell
Set-Location "C:\Users\DELL\Desktop\parking-location"
.\mvnw.cmd clean package
```

L'artefact jar (exécutable spring-boot) sera dans `target/parking-location-0.0.1-SNAPSHOT.jar`.

Run local:

```powershell
java -jar target/parking-location-0.0.1-SNAPSHOT.jar
```

Docker build & run:

```powershell
Set-Location "C:\Users\DELL\Desktop\parking-location"
docker build -t parking-location:latest .
docker run -p 8080:8080 parking-location:latest
```

Notes:
- Le frontend est copié dans `src/main/resources/static` du jar par la configuration Maven et sera servi par Spring Boot sous `/`.
- Vérifiez `src/main/resources/application.properties` pour la configuration de la base de données et adaptez-la pour la production.

## Deploiement separe: Render (backend) + Vercel (frontend)

### 1) Backend sur Render

1. Poussez le projet sur GitHub.
2. Dans Render, creez un **Web Service** depuis ce repo.
3. Utilisez ces commandes:

```bash
./mvnw clean package -DskipTests
```

```bash
java -Dserver.port=$PORT -jar target/parking-location-0.0.1-SNAPSHOT.jar
```

4. Ajoutez les variables d environnement backend (valeurs selon votre infra):
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver`
   - `SPRING_JPA_HIBERNATE_DDL_AUTO=update`
   - `APP_JWTSECRET=<secret-long-32-caracteres-min>`
   - `APP_JWTEXPIRATIONMS=86400000`

### 2) Frontend sur Vercel

1. Dans Vercel, importez le meme repo.
2. Configurez:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Other`
   - **Build Command**: vide
3. (Optionnel) Definissez `__API_URL__` dans `frontend/js/config.js` via script inline ou adaptation du code si vous voulez forcer une URL API specifique.
4. Deployez.

### 3) Liaison Frontend -> Backend

- Le frontend utilise maintenant `frontend/js/config.js`.
- Comportement par defaut:
  - en local (`localhost`): API = `http://localhost:8080/api`
  - en ligne: API = `<origin_du_frontend>/api`
- Pour un backend Render sur un autre domaine, surchargez `window.__API_URL__` avant chargement des scripts metier (ex: `https://votre-backend.onrender.com/api`).

Exemple (a ajouter dans vos pages HTML avant `auth.js`, `parkings.js`, etc.):

```html
<script>
  window.__API_URL__ = 'https://votre-backend.onrender.com/api';
</script>
```

### 4) Verification

1. Ouvrir le frontend Vercel.
2. Tester inscription/connexion.
3. Verifier dans l onglet Network que les appels partent vers Render.
4. Tester listing parkings, reservation, historique, et dashboard admin.

