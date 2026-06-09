# Innofaso – Gestion des Fiches de Non-Conformité (FNC)

Application web (React + Vite) avec backend Node/Express implémentant le
**workflow complet** des non-conformités : cycle de vie tracé, assignation
automatique, alertes SMS critiques et rappels CAPA.

## Fonctionnalités du workflow

| Exigence | Implémentation |
|---|---|
| Transitions de statut `brouillon → ouverte → en cours → clôturée` | Machine à états `server/src/workflow.js` (garde-fous + transitions tracées dans `historique`) |
| Verrouillage post-clôture | `estVerrouillee()` — toute transition/édition refusée une fois clôturée |
| Assignation automatique au pilote du service à la soumission | `notifications.assignerEtNotifierPilote()` + référentiel `organisation.js` |
| Notification automatique du pilote à chaque nouvelle NC | SMS d'assignation envoyé à la soumission |
| Alerte SMS immédiate au RQ + DG pour NC critique (< 30 s) | `notifications.alerterSiCritique()` — délai mesuré et journalisé |
| Rappels automatiques J-3 avant échéance CAPA au responsable | `rappels.js` (fenêtre 0–3 j, idempotent) + planificateur quotidien |
| Tests d'intégration workflow | `server/test/workflow.integration.test.js` (10 tests) |

## Démarrage

### 1. Backend (API + planificateur de rappels)
```bash
cd server
npm install
npm start            # http://localhost:4000
npm test             # tests d'intégration du workflow
```

### 2. Frontend (interface)
```bash
npm install
npm run dev          # http://localhost:5173 (proxy /api -> :4000)
```

Lancer les deux en parallèle (deux terminaux). Le front relaie `/api` vers le
backend via le proxy Vite (voir `vite.config.js`).

## SMS — provider-agnostique

Par défaut, un **MockSmsProvider** journalise les SMS dans une *outbox*
consultable depuis le tableau de bord (onglet « Notifications SMS »). Pour
brancher un vrai fournisseur :

```bash
SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=... npm start
```

Le stub `TwilioSmsProvider` (`server/src/services/sms.js`) montre où câbler
l'API réelle (Twilio, Orange SMS API, etc.).

## Rappels CAPA — démo

Le planificateur s'exécute 1×/jour. Pour tester sans attendre, le tableau de
bord (onglet « Rappels CAPA ») propose un bouton qui force un passage immédiat,
ou via l'API :
```bash
curl -X POST localhost:4000/api/rappels/executer -H 'Content-Type: application/json' -d '{}'
```

## Architecture

```
src/                      Frontend React
  FicheNC.jsx             Formulaire 6 étapes + actions workflow
  components/
    Dashboard.jsx         Pilotage : liste NC, traçabilité, SMS, rappels
    FriseStatut.jsx       Frise des 4 statuts
    ui.jsx                Primitives UI (palette Innofaso)
  lib/{api,theme}.js
server/                   Backend Node/Express
  src/
    workflow.js           Machine à états (transitions, gardes, verrouillage)
    orchestrateur.js      Logique métier de haut niveau
    app.js / index.js     API HTTP + démarrage
    store.js              Persistance JSON
    services/
      organisation.js     Référentiel service -> pilote, RQ, DG
      notifications.js    Assignation pilote + alerte critique chronométrée
      sms.js              Passerelle SMS (mock + stub Twilio)
      rappels.js          Moteur de rappels CAPA J-3 + planificateur
  test/                   Tests d'intégration
```

## API principale

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/nc` | Créer une NC (brouillon) |
| PATCH | `/api/nc/:id` | Mettre à jour (refusé si verrouillée) |
| POST | `/api/nc/:id/soumettre` | brouillon → ouverte (+ assignation + alerte critique) |
| POST | `/api/nc/:id/transition` | `prendre_en_charge`, `cloturer` |
| GET | `/api/nc` `/api/nc/:id` | Lecture |
| GET | `/api/sms` | Outbox SMS |
| GET | `/api/rappels` | Journal des rappels |
| POST | `/api/rappels/executer` | Forcer un passage du moteur de rappels |
