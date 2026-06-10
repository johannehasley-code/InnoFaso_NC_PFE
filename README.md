# Innofaso — Digitalisation Gestion des Non-Conformités

## Stack technique
- **Backend** : Node.js + Express + MySQL (phpMyAdmin / XAMPP)
- **Frontend** : React 18
- **Auth** : JWT (access 30min + refresh 7j)
- **Sécurité** : RBAC, verrouillage compte, audit immuable

## Démarrage rapide

### 1. Base de données (phpMyAdmin)
1. Ouvre phpMyAdmin → http://localhost/phpmyadmin
2. Clique **Nouvelle base de données** → nom : `innofaso_db` → Créer
3. Sélectionne `innofaso_db` → onglet **SQL**
4. Colle le contenu de `backend/config/schema.sql` → Exécuter

### 2. Backend
```bash
cd backend
npm install
# Edite .env si besoin (mot de passe MySQL)
npm run seed     # hash les mots de passe une seule fois
npm run dev      # démarre sur http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start        # démarre sur http://localhost:3000
```

## Comptes de test (tous : Innofaso@2026!)
| Email | Rôle |
|-------|------|
| admin@innofaso.bf | Administrateur |
| rq@innofaso.bf | Responsable Qualité |
| dg@innofaso.bf | Direction |
| chef@innofaso.bf | Responsable Service |
| operateur@innofaso.bf | Opérateur |
