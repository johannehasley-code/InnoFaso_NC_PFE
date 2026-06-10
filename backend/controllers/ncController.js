// controllers/ncController.js
const db  = require('../config/db');
const { log } = require('../models/auditLog');

// Génère le numéro NC-AAAA-NNN
const genNumero = async () => {
  const year = new Date().getFullYear();
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS cnt FROM non_conformites WHERE YEAR(created_at)=?',[year]
  );
  const n = (rows[0].cnt + 1).toString().padStart(3,'0');
  return `NC-${year}-${n}`;
};

// GET /api/nc
const getAll = async (req, res) => {
  try {
    const { statut, criticite, service } = req.query;
    let q = `SELECT nc.*,
               u1.nom AS emetteur_nom, u1.prenom AS emetteur_prenom,
               u2.nom AS responsable_nom, u2.prenom AS responsable_prenom
             FROM non_conformites nc
             LEFT JOIN users u1 ON nc.emetteur_id=u1.id
             LEFT JOIN users u2 ON nc.responsable_id=u2.id
             WHERE 1=1`;
    const p = [];

    // Opérateur ne voit que ses NC
    if (req.user.role === 'operateur') {
      q += ' AND nc.emetteur_id=?'; p.push(req.user.id);
    }
    // Responsable service voit les NC de son service
    if (req.user.role === 'responsable_service') {
      q += ' AND nc.service_emetteur=?'; p.push(req.user.service);
    }
    if (statut)    { q += ' AND nc.statut=?';            p.push(statut); }
    if (criticite) { q += ' AND nc.criticite=?';         p.push(criticite); }
    if (service)   { q += ' AND nc.service_emetteur=?';  p.push(service); }

    q += ' ORDER BY nc.created_at DESC';
    const [rows] = await db.execute(q,p);
    res.json({ success:true, data:rows });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

// GET /api/nc/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT nc.*,
         u1.nom AS emetteur_nom, u1.prenom AS emetteur_prenom,
         u2.nom AS responsable_nom, u2.prenom AS responsable_prenom
       FROM non_conformites nc
       LEFT JOIN users u1 ON nc.emetteur_id=u1.id
       LEFT JOIN users u2 ON nc.responsable_id=u2.id
       WHERE nc.id=?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'NC introuvable.' });
    res.json({ success:true, data:rows[0] });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

// POST /api/nc
const create = async (req, res) => {
  const { titre, description, service_emetteur, criticite, date_detection, date_echeance } = req.body;
  try {
    const numero = await genNumero();
    const [r] = await db.execute(
      `INSERT INTO non_conformites
         (numero_nc,titre,description,service_emetteur,criticite,statut,emetteur_id,date_detection,date_echeance)
       VALUES (?,?,?,?,?,'ouverte',?,?,?)`,
      [numero, titre, description, service_emetteur, criticite||'mineure',
       req.user.id, date_detection||new Date().toISOString().slice(0,10), date_echeance||null]
    );
    await log({ userId:req.user.id, action:'CREATE_NC', targetTable:'non_conformites',
                targetId:r.insertId, newValue:{numero,titre,criticite}, ipAddress:req.ip });
    res.status(201).json({ success:true, message:'NC créée.', data:{ id:r.insertId, numero_nc:numero } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

// PUT /api/nc/:id/statut
const updateStatut = async (req, res) => {
  const TRANSITIONS = {
    brouillon: ['ouverte'],
    ouverte:   ['en_cours'],
    en_cours:  ['cloturee'],
    cloturee:  [],
  };
  try {
    const [rows] = await db.execute('SELECT * FROM non_conformites WHERE id=?',[req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'NC introuvable.' });
    const nc = rows[0];
    const { statut } = req.body;
    if (!TRANSITIONS[nc.statut]?.includes(statut))
      return res.status(400).json({ success:false,
        message:`Transition ${nc.statut} → ${statut} non autorisée.` });
    const extra = statut === 'cloturee' ? ', date_cloture=NOW()' : '';
    await db.execute(`UPDATE non_conformites SET statut=?${extra} WHERE id=?`,[statut,req.params.id]);
    await log({ userId:req.user.id, action:'UPDATE_NC_STATUT', targetTable:'non_conformites',
                targetId:parseInt(req.params.id), oldValue:{statut:nc.statut}, newValue:{statut},
                ipAddress:req.ip });
    res.json({ success:true, message:`NC passée en "${statut}".` });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

// GET /api/nc/stats
const getStats = async (req, res) => {
  try {
    const [total]    = await db.execute('SELECT COUNT(*) AS n FROM non_conformites');
    const [ouvertes] = await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut IN ('ouverte','en_cours')");
    const [critiques]= await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE criticite='critique' AND statut!='cloturee'");
    const [cloturees]= await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut='cloturee'");
    const [byCrit]   = await db.execute(
      "SELECT criticite, COUNT(*) AS n FROM non_conformites GROUP BY criticite"
    );
    res.json({ success:true, data:{
      total:     total[0].n,
      ouvertes:  ouvertes[0].n,
      critiques: critiques[0].n,
      cloturees: cloturees[0].n,
      byCriticite: byCrit,
    }});
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

module.exports = { getAll, getById, create, updateStatut, getStats };
