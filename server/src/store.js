// ============================================================================
//  store.js — Couche d'accès aux données (interface unique, 100% asynchrone).
//
//  Deux implémentations partagent EXACTEMENT la même interface :
//    • StoreMemoire — en mémoire vive, sans dépendance. Sert aux tests
//      automatisés et de repli si MySQL n'est pas configuré.
//    • StoreMysql   — persistance réelle dans MySQL (voir ./storeMysql.js).
//
//  Toutes les méthodes renvoient des Promesses : le reste de l'application
//  (orchestrateur, API) fait « await » indifféremment, quelle que soit
//  l'implémentation. C'est ce qui permet de tester sans serveur MySQL tout
//  en livrant une vraie base de données en production.
//
//  La factory creerStore() choisit l'implémentation selon la variable
//  d'environnement DB_DRIVER (« mysql » ou « memoire »).
// ============================================================================

let _id = 0;
export function nouvelId() {
  return `nc_${Date.now()}_${++_id}`;
}

// ---------------------------------------------------------------------------
//  Implémentation EN MÉMOIRE (tests / repli).
// ---------------------------------------------------------------------------
export class StoreMemoire {
  constructor() {
    this.ncs = [];
    this.compteur = 0;
  }

  async init() { return this; }

  async genererNumero() {
    this.compteur += 1;
    const annee = new Date().getFullYear();
    return `FNC-${annee}-${String(this.compteur).padStart(4, '0')}`;
  }

  async listerNcs() {
    // Copie pour éviter les mutations externes accidentelles.
    return this.ncs.map((n) => structuredClone(n));
  }

  async trouverNc(id) {
    const nc = this.ncs.find((n) => n.id === id);
    return nc ? structuredClone(nc) : null;
  }

  async ajouterNc(nc) {
    this.ncs.push(structuredClone(nc));
    return structuredClone(nc);
  }

  async remplacerNc(ncMaj) {
    const i = this.ncs.findIndex((n) => n.id === ncMaj.id);
    if (i === -1) return null;
    this.ncs[i] = structuredClone(ncMaj);
    return structuredClone(ncMaj);
  }

  async fermer() { /* rien à fermer en mémoire */ }
}

// Alias de compatibilité : l'ancien nom « Store » reste valable.
export const Store = StoreMemoire;

// ---------------------------------------------------------------------------
//  Factory : choisit l'implémentation selon l'environnement.
//  - DB_DRIVER=mysql  -> StoreMysql (nécessite les variables DB_*)
//  - sinon            -> StoreMemoire
//  En mode test (NODE_ENV=test), on force toujours la mémoire.
// ---------------------------------------------------------------------------
export async function creerStore() {
  const driver = (process.env.DB_DRIVER || '').toLowerCase();
  if (process.env.NODE_ENV !== 'test' && driver === 'mysql') {
    const { StoreMysql } = await import('./storeMysql.js');
    const store = new StoreMysql();
    await store.init();
    return store;
  }
  return new StoreMemoire();
}
