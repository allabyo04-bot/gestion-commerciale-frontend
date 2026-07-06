# Gestion Commerciale — Frontend

Interface React qui parle au backend (voir dossier `gestion-commerciale-backend`).

## Démarrage en local

1. `npm install`
2. Copie `.env.example` en `.env`, mets l'URL de ton backend (celle de Railway, ou `http://localhost:4000` si tu testes contre le backend en local)
3. `npm run dev`
4. Ouvre l'URL affichée (généralement `http://localhost:5173`)

Connecte-toi avec `djenie` / `1234` (ou le compte que tu as créé/modifié).

## Déploiement (Railway, comme le backend)

1. Pousse ce dossier sur un nouveau dépôt GitHub (même procédure que pour le backend)
2. Sur Railway, dans le même projet, "+ Add" → "GitHub Repo" → sélectionne ce dépôt
3. Ajoute la variable d'environnement `VITE_API_URL` avec l'URL de ton backend
4. Railway build le projet (`npm install` puis `vite build`) — il faut configurer le "Start Command" pour servir le dossier `dist/` (ex: avec un petit serveur statique). Demande-moi à ce moment-là, je te donnerai la configuration exacte.

## Important — n'oublie pas côté backend

Une fois le frontend déployé avec son URL, retourne dans les variables du service **backend** sur Railway et remplace `FRONTEND_URL="*"` par l'URL exacte du frontend, pour resserrer la sécurité (CORS).
