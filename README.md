# InnoFaso NC — Gestion des Non-Conformités

Application web complète : workflow NC + authentification JWT + base MySQL.

## Stack technique
- **Frontend** : React + Vite
- **Backend** : Node.js + Express + MySQL
- **Auth** : JWT (access 30min + refresh 7j)
- **Notifications** : EmailJS (emails automatiques)
- **Sécurité** : RBAC, verrouillage compte, audit immuable

## Démarrage

### 1. Base de données (XAMPP)
Démarrer MySQL depuis `C:\xampp` en administrateur, puis dans phpMyAdmin exécuter `server/src/db/schema.sql`.

### 2. Backend
```bash
cd server
npm install
cp .env.example .env
npm start              # http://localhost:4000
```

### 3. Frontend
```bash
npm install
npm run dev            # http://localhost:5173
```

## Comptes de test (mot de passe : Innofaso@2026!)
| Email | Rôle |
|-------|------|
| admin@innofaso.bf | Administrateur |
| rq@innofaso.bf | Responsable Qualité |
| dg@innofaso.bf | Direction |
| chef@innofaso.bf | Responsable Service |
| operateur@innofaso.bf | Opérateur |

## Fonctionnalités

### Gestion NC (Johanne)
- Formulaire 6 étapes avec aide contextuelle
- Workflow complet brouillon → ouverte → en cours → clôturée
- Analyse 5M + 5 Pourquoi par M
- Plans CAPA avec rappels automatiques J-3
- Notifications email via EmailJS
- Alerte critique RQ + DG automatique

### Authentification (collègue)
- Inscription avec validation admin
- Connexion JWT sécurisée
- Rôles : Opérateur, Responsable Service, RQ, Direction, Admin
- Verrouillage compte après 5 tentatives
- Audit log immuable