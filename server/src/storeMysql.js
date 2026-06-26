// ============================================================================
//  storeMysql.js — Implémentation MySQL de l'interface Store.
//
//  Mêmes méthodes que StoreMemoire, mais les données vivent dans MySQL.
//  Utilise « mysql2 » avec un pool de connexions (recommandé en production :
//  les connexions sont réutilisées au lieu d'en ouvrir une par requête).
//
//  Les colonnes JSON (type_objet, analyse, capa, cloture, assigne_a,
//  historique, evenements) sont sérialisées/désérialisées automatiquement :
//  on stocke du JSON.stringify, on relit avec JSON.parse.
// ============================================================================

import mysql from 'mysql2/promise';

export class StoreMysql {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: Number(config.port || process.env.DB_PORT || 3306),
      user: config.user || process.env.DB_USER || 'root',
      password: config.password || process.env.DB_PASSWORD || '',
      database: config.database || process.env.DB_NAME || 'innofaso_nc',
      waitForConnections: true,
      connectionLimit: 10,
      // Décode automatiquement les colonnes JSON en objets JS.
      typeCast(field, next) {
        return next();
      },
    };
    this.pool = null;
  }

  async init() {
    this.pool = mysql.createPool(this.config);
    // Vérifie la connexion dès le démarrage pour échouer vite et clairement.
    const cx = await this.pool.getConnection();
    await cx.ping();
    cx.release();
    return this;
  }

  // -- Génération atomique du numéro FNC-AAAA-NNNN -------------------------
  //  Le motif INSERT ... ON DUPLICATE KEY UPDATE avec LAST_INSERT_ID()
  //  incrémente le compteur de l'année de façon atomique, même si plusieurs
  //  fiches sont créées en même temps (pas de doublon de numéro).
  async genererNumero() {
    const annee = new Date().getFullYear();
    const cx = await this.pool.getConnection();
    try {
      await cx.query(
        `INSERT INTO compteur_numero (annee, valeur) VALUES (?, LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE valeur = LAST_INSERT_ID(valeur + 1)`,
        [annee],
      );
      const [rows] = await cx.query('SELECT LAST_INSERT_ID() AS n');
      const n = rows[0].n;
      return `FNC-${annee}-${String(n).padStart(4, '0')}`;
    } finally {
      cx.release();
    }
  }

  async listerNcs() {
    const [rows] = await this.pool.query(
      'SELECT * FROM nc ORDER BY cree_le DESC',
    );
    return rows.map(ligneVersNc);
  }

  async trouverNc(id) {
    const [rows] = await this.pool.query('SELECT * FROM nc WHERE id = ?', [id]);
    return rows.length ? ligneVersNc(rows[0]) : null;
  }

  async ajouterNc(nc) {
    await this.pool.query(
      `INSERT INTO nc
        (id, numero, statut, cree_le, maj_le, emetteur, service, intitule,
         description, criticite, classification, type_objet, analyse, capa,
         cloture, assigne_a, historique, evenements, valeurs_perso, donnees)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ncVersParams(nc),
    );
    return nc;
  }

   async remplacerNc(ncMaj) {
    const [res] = await this.pool.query(
      `UPDATE nc SET
        numero=?, statut=?, cree_le=?, maj_le=?, emetteur=?, service=?,
        intitule=?, description=?, criticite=?, classification=?,
        type_objet=?, analyse=?, capa=?, cloture=?, assigne_a=?,
        historique=?, evenements=?, valeurs_perso=?, donnees=?
       WHERE id=?`,
      [...ncVersParams(ncMaj).slice(1), ncMaj.id],
    );
    return res.affectedRows ? ncMaj : null;
  }

  
  async listerColonnesPerso() {
    const [rows] = await this.pool.query(
      'SELECT * FROM colonnes_personnalisees ORDER BY ordre ASC, cree_le ASC',
    );
    return rows.map((r) => ({
      id: r.id,
      cle: r.cle,
      libelle: r.libelle,
      type: r.type,
      ordre: r.ordre,
      creePar: r.cree_par,
      creeLe: new Date(r.cree_le).toISOString(),
    }));
  }
 
  async ajouterColonnePerso(colonne) {
    await this.pool.query(
      `INSERT INTO colonnes_personnalisees (id, cle, libelle, type, ordre, cree_par)
       VALUES (?,?,?,?,?,?)`,
      [colonne.id, colonne.cle, colonne.libelle, colonne.type || 'texte',
       colonne.ordre || 0, colonne.creePar || null],
    );
    return colonne;
  }
 
  async supprimerColonnePerso(id) {
    const [res] = await this.pool.query(
      'DELETE FROM colonnes_personnalisees WHERE id = ?', [id],
    );
    return res.affectedRows > 0;
  }
 
  async majValeursPerso(ncId, valeurs) {
    const [res] = await this.pool.query(
      'UPDATE nc SET valeurs_perso = ? WHERE id = ?',
      [JSON.stringify(valeurs), ncId],
    );
    if (!res.affectedRows) return null;
    return this.trouverNc(ncId);
  }
 
  async fermer() {
    if (this.pool) await this.pool.end();
  }
}

// --- Conversions objet JS <-> ligne SQL ------------------------------------

const dt = (iso) => new Date(iso).toISOString().slice(0, 23).replace('T', ' ');
const j = (v) => JSON.stringify(v ?? null);

// Champs déjà portés par des colonnes SQL dédiées. Tout le reste de l'objet
// NC (refDocument, verifiePar, nomProduit, lotInterne, exigence, realiseePar,
// destinataires, etc.) part dans la colonne JSON générique `donnees`, ce qui
// évite d'avoir à migrer la table à chaque nouveau champ ajouté au formulaire.
const COLONNES_DEDIEES = [
  'id', 'numero', 'statut', 'creeLe', 'majLe', 'emetteur', 'service',
  'intitule', 'description', 'criticite', 'classification', 'typeObjet',
  'analyse', 'capa', 'cloture', 'assigneA', 'historique', 'evenements',
  'valeursPerso',
];

function extraireDonneesSupplementaires(nc) {
  const extra = {};
  for (const k of Object.keys(nc)) {
    if (!COLONNES_DEDIEES.includes(k)) extra[k] = nc[k];
  }
  return extra;
}

function ncVersParams(nc) {
  return [
    nc.id,
    nc.numero,
    nc.statut,
    dt(nc.creeLe),
    dt(nc.majLe),
    nc.emetteur || '',
    nc.service || '',
    nc.intitule || '',
    nc.description || '',
    nc.criticite || 'moyenne',
    nc.classification || '',
    j(nc.typeObjet || []),
    j(nc.analyse || {}),
    j(nc.capa || { actions: [] }),
    j(nc.cloture || null),
    j(nc.assigneA || null),
    j(nc.historique || []),
    j(nc.evenements || []),
    j(nc.valeursPerso || {}),
    j(extraireDonneesSupplementaires(nc)),
  ];
}
// mysql2 renvoie les colonnes JSON déjà parsées (objets) ; on gère les deux cas.
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function ligneVersNc(r) {
  return {
    ...(parse(r.donnees) || {}),
    id: r.id,
    numero: r.numero,
    statut: r.statut,
    creeLe: new Date(r.cree_le).toISOString(),
    majLe: new Date(r.maj_le).toISOString(),
    emetteur: r.emetteur,
    service: r.service,
    intitule: r.intitule,
    description: r.description || '',
    criticite: r.criticite,
    classification: r.classification,
    typeObjet: parse(r.type_objet) || [],
    analyse: parse(r.analyse) || { cinqM: {}, cinqPourquoi: [] },
    capa: parse(r.capa) || { actions: [] },
    cloture: parse(r.cloture),
    assigneA: parse(r.assigne_a),
    historique: parse(r.historique) || [],
    evenements: parse(r.evenements) || [],
    valeursPerso: parse(r.valeurs_perso) || {},
  };
}
 
