// controllers/exportController.js
// Sprint 8 — Exports, Rapports et Archivage (F10, F11, F15)

const db       = require('../config/db');
const PDFDoc   = require('pdfkit');
const ExcelJS  = require('exceljs');
const { log }  = require('../models/auditLog');

// ─────────────────────────────────────────────────────────────
// HELPER : construire la requête NC avec filtres
// ─────────────────────────────────────────────────────────────
const buildNcQuery = (filters = {}, userRole, userId, userService) => {
  let q = `
    SELECT
      nc.id, nc.numero_nc, nc.titre, nc.description,
      nc.service_emetteur, nc.criticite, nc.statut,
      nc.date_detection, nc.date_echeance, nc.date_cloture,
      nc.created_at, nc.updated_at,
      u1.nom AS emetteur_nom, u1.prenom AS emetteur_prenom,
      u2.nom AS responsable_nom, u2.prenom AS responsable_prenom
    FROM non_conformites nc
    LEFT JOIN users u1 ON nc.emetteur_id    = u1.id
    LEFT JOIN users u2 ON nc.responsable_id = u2.id
    WHERE 1=1
  `;
  const p = [];

  // RBAC
  if (userRole === 'operateur') {
    q += ' AND nc.emetteur_id = ?'; p.push(userId);
  } else if (userRole === 'responsable_service') {
    q += ' AND nc.service_emetteur = ?'; p.push(userService);
  }

  // Filtres dynamiques
  if (filters.statut)          { q += ' AND nc.statut = ?';             p.push(filters.statut); }
  if (filters.criticite)       { q += ' AND nc.criticite = ?';          p.push(filters.criticite); }
  if (filters.service)         { q += ' AND nc.service_emetteur = ?';   p.push(filters.service); }
  if (filters.date_debut)      { q += ' AND nc.date_detection >= ?';    p.push(filters.date_debut); }
  if (filters.date_fin)        { q += ' AND nc.date_detection <= ?';    p.push(filters.date_fin); }
  if (filters.lot)             { q += ' AND nc.lot LIKE ?';             p.push(`%${filters.lot}%`); }
  if (filters.fournisseur)     { q += ' AND nc.fournisseur LIKE ?';     p.push(`%${filters.fournisseur}%`); }
  if (filters.search) {
    q += ' AND (nc.numero_nc LIKE ? OR nc.titre LIKE ? OR nc.description LIKE ?)';
    const s = `%${filters.search}%`;
    p.push(s, s, s);
  }

  q += ' ORDER BY nc.created_at DESC';

  if (filters.limit)  { q += ' LIMIT ?';  p.push(parseInt(filters.limit)); }
  if (filters.offset) { q += ' OFFSET ?'; p.push(parseInt(filters.offset)); }

  return { q, p };
};

// ─────────────────────────────────────────────────────────────
// 3.2.3 — GET /api/exports/nc  (recherche + filtrage multicritère F11)
// ─────────────────────────────────────────────────────────────
const searchNC = async (req, res) => {
  try {
    const { q, p } = buildNcQuery(
      req.query,
      req.user.role,
      req.user.id,
      req.user.service
    );
    const [rows] = await db.execute(q, p);

    // Pagination meta
    const countQuery = q.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) AS total FROM')
                        .replace(/ORDER BY[\s\S]*$/, '');
    const [countRows] = await db.execute(countQuery, p.slice(0, p.length));

    await log({ userId: req.user.id, action: 'SEARCH_NC', ipAddress: req.ip,
                newValue: { filters: req.query, results: rows.length } });

    res.json({
      success: true,
      data: rows,
      meta: {
        total:  countRows[0]?.total || rows.length,
        count:  rows.length,
        filters: req.query,
      }
    });
  } catch (err) {
    console.error('searchNC error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 3.2.1 — GET /api/exports/nc/:id/pdf  (Export PDF fiche NC F10)
// ─────────────────────────────────────────────────────────────
const exportNcPDF = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT nc.*, u1.nom AS e_nom, u1.prenom AS e_prenom, u1.service AS e_service,
              u2.nom AS r_nom, u2.prenom AS r_prenom
       FROM non_conformites nc
       LEFT JOIN users u1 ON nc.emetteur_id    = u1.id
       LEFT JOIN users u2 ON nc.responsable_id = u2.id
       WHERE nc.id = ?`, [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'NC introuvable.' });

    const nc = rows[0];

    // ── Création du PDF ──────────────────────────────────────
    const doc = new PDFDoc({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="NC_${nc.numero_nc}_${Date.now()}.pdf"`);
    doc.pipe(res);

    const BLUE   = '#1F4E79';
    const ACCENT = '#2E75B6';
    const GREY   = '#F3F4F6';
    const W      = 515; // largeur utile

    const critColor = { observation:'#059669', mineure:'#D97706', majeure:'#DC2626', critique:'#7C3AED' };
    const statColor = { brouillon:'#9CA3AF', ouverte:'#2563EB', en_cours:'#D97706', cloturee:'#059669' };

    const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

    // ── EN-TÊTE ──────────────────────────────────────────────
    doc.rect(40, 40, W, 60).fill(BLUE);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text('FICHE DE NON-CONFORMITÉ', 50, 52);
    doc.fontSize(10).font('Helvetica')
       .text('INNOFASO — Système de Management de la Qualité', 50, 76);
    doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
       .text(nc.numero_nc, W - 60, 58, { align: 'right', width: 90 });

    doc.moveDown(4.5);

    // ── Fonction cellule ─────────────────────────────────────
    const row = (label, value, y, labelW = 160) => {
      const x = 40;
      doc.rect(x, y, labelW, 22).fill('#D6E4F0');
      doc.rect(x + labelW, y, W - labelW, 22).fill(GREY);
      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
         .text(label, x + 4, y + 7, { width: labelW - 8 });
      doc.fillColor('#222').font('Helvetica')
         .text(String(value || '—'), x + labelW + 4, y + 7, { width: W - labelW - 8 });
    };

    const section = (title, y) => {
      doc.rect(40, y, W, 20).fill(ACCENT);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(title, 44, y + 5);
      return y + 20;
    };

    // ── SECTION 1 : Identification ───────────────────────────
    let y = 115;
    y = section('1.  IDENTIFICATION DE LA NON-CONFORMITÉ', y);
    row('Numéro NC',      nc.numero_nc,       y);      y += 24;
    row('Date détection', fmt(nc.date_detection), y);  y += 24;
    row('Service émetteur', nc.service_emetteur, y);   y += 24;
    row('Émetteur',
        `${nc.e_prenom || ''} ${nc.e_nom || ''}`.trim() || '—', y); y += 24;
    row('Criticité',      nc.criticite?.toUpperCase(), y); y += 24;
    row('Statut',         nc.statut?.toUpperCase(),    y); y += 28;

    // ── SECTION 2 : Description ──────────────────────────────
    y = section('2.  DESCRIPTION DE LA NON-CONFORMITÉ', y);
    row('Titre', nc.titre, y); y += 24;

    // Zone description multi-lignes
    doc.rect(40, y, 160, 60).fill('#D6E4F0');
    doc.rect(200, y, W - 160, 60).fill(GREY);
    doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text('Description', 44, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(nc.description || '—', 204, y + 4,
             { width: W - 168, height: 52, ellipsis: true });
    y += 64;

    // ── SECTION 3 : Traitement ───────────────────────────────
    y = section('3.  TRAITEMENT ET ACTIONS', y);
    row('Responsable traitement',
        nc.r_prenom ? `${nc.r_prenom} ${nc.r_nom}` : '—', y); y += 24;
    row('Date échéance', fmt(nc.date_echeance), y); y += 24;

    // Zone action immédiate
    doc.rect(40, y, 160, 50).fill('#D6E4F0');
    doc.rect(200, y, W - 160, 50).fill(GREY);
    doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text('Action immédiate', 44, y + 4);
    doc.fillColor('#666').font('Helvetica').fontSize(9)
       .text('(à renseigner)', 204, y + 4);
    y += 54;

    // ── SECTION 4 : Analyse causes ───────────────────────────
    y = section('4.  ANALYSE DES CAUSES (5M)', y);
    ['Main-d\'œuvre', 'Matériel', 'Matière', 'Milieu', 'Méthode'].forEach(m => {
      doc.rect(40, y, 160, 22).fill('#D6E4F0');
      doc.rect(200, y, W - 160, 22).fill(GREY);
      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text(m, 44, y + 7);
      y += 24;
    });
    y += 4;

    // ── SECTION 5 : 5 Pourquoi ───────────────────────────────
    y = section('5.  MÉTHODE DES 5 POURQUOI', y);
    for (let i = 1; i <= 5; i++) {
      doc.rect(40, y, 160, 20).fill('#D6E4F0');
      doc.rect(200, y, W - 160, 20).fill(GREY);
      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text(`Pourquoi ${i}`, 44, y + 6);
      y += 22;
    }
    y += 4;

    // ── SECTION 6 : Vérification / Clôture ───────────────────
    y = section('6.  VÉRIFICATION & CLÔTURE', y);
    row('Date clôture', fmt(nc.date_cloture), y);            y += 24;
    row('Efficacité vérifiée', nc.statut === 'cloturee' ? 'OUI' : 'EN ATTENTE', y); y += 28;

    // Signatures
    doc.rect(40, y, W / 2 - 5, 50).fill('#D6E4F0');
    doc.rect(40 + W / 2 + 5, y, W / 2 - 5, 50).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
       .text('Signature Émetteur :', 44, y + 5)
       .text('Signature Responsable Qualité :', 44 + W / 2 + 5, y + 5);
    y += 54;

    // ── PIED DE PAGE ─────────────────────────────────────────
    doc.rect(40, y + 4, W, 20).fill(ACCENT);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(
         `Innofaso © ${new Date().getFullYear()} — Document confidentiel — ` +
         `Généré le ${new Date().toLocaleString('fr-FR')} — ` +
         `Référence : ${nc.numero_nc}`,
         44, y + 10
       );

    doc.end();

    await log({ userId: req.user.id, action: 'EXPORT_NC_PDF', targetTable: 'non_conformites',
                targetId: parseInt(req.params.id), ipAddress: req.ip });

  } catch (err) {
    console.error('exportNcPDF error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération PDF.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 3.2.2 — GET /api/exports/nc/excel  (Export Excel F10)
// ─────────────────────────────────────────────────────────────
const exportNcExcel = async (req, res) => {
  try {
    const { q, p } = buildNcQuery(
      req.query, req.user.role, req.user.id, req.user.service
    );
    const [rows] = await db.execute(q, p);

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Innofaso SMQ';
    wb.created  = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet('Non-Conformités', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    // ── Titre ────────────────────────────────────────────────
    ws.mergeCells('A1:L1');
    ws.getCell('A1').value = 'INNOFASO — Liste des Non-Conformités';
    ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:L2');
    ws.getCell('A2').value =
      `Exporté le ${new Date().toLocaleString('fr-FR')} — ` +
      `Filtres : ${JSON.stringify(req.query) || 'Aucun'}`;
    ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    ws.getRow(2).height = 16;

    // ── En-têtes colonnes ────────────────────────────────────
    const COLS = [
      { header: 'Numéro NC',        key: 'numero_nc',       width: 16 },
      { header: 'Titre',            key: 'titre',           width: 40 },
      { header: 'Service',          key: 'service_emetteur',width: 18 },
      { header: 'Criticité',        key: 'criticite',       width: 14 },
      { header: 'Statut',           key: 'statut',          width: 14 },
      { header: 'Émetteur',         key: 'emetteur',        width: 22 },
      { header: 'Responsable',      key: 'responsable',     width: 22 },
      { header: 'Date détection',   key: 'date_detection',  width: 16 },
      { header: 'Date échéance',    key: 'date_echeance',   width: 16 },
      { header: 'Date clôture',     key: 'date_cloture',    width: 16 },
      { header: 'Description',      key: 'description',     width: 50 },
      { header: 'Date création',    key: 'created_at',      width: 18 },
    ];
    ws.columns = COLS;

    const headerRow = ws.getRow(3);
    COLS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value     = c.header;
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    });
    headerRow.height = 24;

    // Couleurs criticité
    const CRIT_COLORS = {
      observation: { argb: 'FFD1FAE5' }, mineure:  { argb: 'FFFFF3CD' },
      majeure:     { argb: 'FFFEE2E2' }, critique: { argb: 'FFEDE9FE' },
    };

    // ── Données ──────────────────────────────────────────────
    rows.forEach((nc, idx) => {
      const r = ws.addRow({
        numero_nc:       nc.numero_nc,
        titre:           nc.titre,
        service_emetteur:nc.service_emetteur || '—',
        criticite:       nc.criticite,
        statut:          nc.statut,
        emetteur:        nc.e_prenom ? `${nc.e_prenom} ${nc.e_nom}` : '—',
        responsable:     nc.r_prenom ? `${nc.r_prenom} ${nc.r_nom}` : '—',
        date_detection:  nc.date_detection
          ? new Date(nc.date_detection).toLocaleDateString('fr-FR') : '—',
        date_echeance:   nc.date_echeance
          ? new Date(nc.date_echeance).toLocaleDateString('fr-FR') : '—',
        date_cloture:    nc.date_cloture
          ? new Date(nc.date_cloture).toLocaleDateString('fr-FR') : '—',
        description:     nc.description || '—',
        created_at:      new Date(nc.created_at).toLocaleString('fr-FR'),
      });

      const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      const critBg = CRIT_COLORS[nc.criticite]?.argb || rowBg;

      r.eachCell((cell, colNum) => {
        cell.font      = { size: 9 };
        cell.alignment = { vertical: 'middle', wrapText: colNum === 2 || colNum === 11 };
        cell.fill      = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: colNum === 4 ? critBg : rowBg },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      r.height = 18;
    });

    // ── Onglet statistiques ──────────────────────────────────
    const wsStats = wb.addWorksheet('Statistiques');
    wsStats.columns = [
      { header: 'Indicateur', key: 'label', width: 30 },
      { header: 'Valeur',     key: 'value', width: 15 },
    ];

    const total   = rows.length;
    const byStatut = {};
    const byCrit   = {};
    rows.forEach(r => {
      byStatut[r.statut]    = (byStatut[r.statut]    || 0) + 1;
      byCrit[r.criticite]   = (byCrit[r.criticite]   || 0) + 1;
    });

    wsStats.addRow({ label: 'Total NC exportées', value: total });
    Object.entries(byStatut).forEach(([k,v]) =>
      wsStats.addRow({ label: `Statut : ${k}`, value: v }));
    Object.entries(byCrit).forEach(([k,v]) =>
      wsStats.addRow({ label: `Criticité : ${k}`, value: v }));
    wsStats.addRow({ label: 'Date export', value: new Date().toLocaleString('fr-FR') });

    // ── Envoi ────────────────────────────────────────────────
    const filename = `Innofaso_NC_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();

    await log({ userId: req.user.id, action: 'EXPORT_NC_EXCEL', ipAddress: req.ip,
                newValue: { count: rows.length, filters: req.query } });

  } catch (err) {
    console.error('exportNcExcel error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération Excel.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 3.2.4 — GET /api/exports/rapport-mensuel  (Rapport mensuel F15)
// Aussi déclenché automatiquement le 5 de chaque mois (cron)
// ─────────────────────────────────────────────────────────────
const genRapportMensuel = async (mois, annee) => {
  const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
  const finDate = new Date(annee, mois, 0);
  const fin   = `${annee}-${String(mois).padStart(2,'0')}-${finDate.getDate()}`;

  const [rows] = await db.execute(
    `SELECT nc.*, u1.nom AS e_nom, u1.prenom AS e_prenom
     FROM non_conformites nc
     LEFT JOIN users u1 ON nc.emetteur_id=u1.id
     WHERE nc.date_detection BETWEEN ? AND ?
     ORDER BY nc.criticite DESC, nc.created_at DESC`,
    [debut, fin]
  );

  const [prev] = await db.execute(
    `SELECT COUNT(*) AS n FROM non_conformites
     WHERE date_detection BETWEEN DATE_SUB(?, INTERVAL 1 MONTH)
     AND DATE_SUB(?, INTERVAL 1 MONTH)`, [debut, fin]
  );

  const stats = {
    total:    rows.length,
    prevMois: prev[0].n,
    byCrit:   {},
    byStatut: {},
    byService:{},
    closees:  rows.filter(r=>r.statut==='cloturee').length,
    critiques:rows.filter(r=>r.criticite==='critique').length,
    tauxCloture: rows.length ? Math.round(rows.filter(r=>r.statut==='cloturee').length/rows.length*100) : 0,
  };
  rows.forEach(r => {
    stats.byCrit[r.criticite]      = (stats.byCrit[r.criticite]||0)+1;
    stats.byStatut[r.statut]       = (stats.byStatut[r.statut]||0)+1;
    stats.byService[r.service_emetteur||'N/A'] = (stats.byService[r.service_emetteur||'N/A']||0)+1;
  });

  // ── Génération Excel rapport ─────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Innofaso SMQ';
  const ws = wb.addWorksheet('Rapport Mensuel');
  const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR',{month:'long',year:'numeric'});

  // Titre
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
  ws.getCell('A1').font  = { bold:true, size:14, color:{argb:'FFFFFFFF'} };
  ws.getCell('A1').fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
  ws.getCell('A1').alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = `INNOFASO — Gestion des Non-Conformités — Généré automatiquement le 5 du mois`;
  ws.getCell('A2').font  = { italic:true, size:9, color:{argb:'FF555555'} };
  ws.getCell('A2').fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD6E4F0'} };

  // KPIs synthèse
  ws.getRow(4).values = ['INDICATEUR', 'VALEUR', 'OBJECTIF', 'ÉTAT'];
  ws.getRow(4).font   = { bold:true, color:{argb:'FFFFFFFF'}, size:10 };
  ws.getRow(4).fill   = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2E75B6'} };
  ws.getRow(4).height = 20;

  const kpiRows = [
    ['Total NC détectées',           stats.total,           '—',   stats.total <= stats.prevMois ? '✅' : '⚠️'],
    ['NC vs mois précédent',         `${stats.total} vs ${stats.prevMois}`, '≤ mois préc.', stats.total <= stats.prevMois ? '✅' : '⚠️'],
    ['NC Critiques',                 stats.critiques,       '0',   stats.critiques === 0 ? '✅' : '🔴'],
    ['Taux de clôture dans délais',  `${stats.tauxCloture}%`, '> 80%', stats.tauxCloture >= 80 ? '✅' : '⚠️'],
    ['NC clôturées ce mois',         stats.closees,         '—',   '—'],
  ];
  kpiRows.forEach((r, i) => {
    const row = ws.addRow(r);
    row.height = 18;
    row.getCell(1).font = { bold:true, size:9 };
    row.getCell(2).alignment = { horizontal:'center' };
    row.getCell(4).alignment = { horizontal:'center' };
    row.fill = { type:'pattern', pattern:'solid',
                 fgColor:{ argb: i%2===0 ? 'FFF9FAFB' : 'FFFFFFFF' } };
  });

  // Répartition criticité
  ws.addRow([]);
  const h2 = ws.addRow(['RÉPARTITION PAR CRITICITÉ', '', '', '']);
  h2.font = { bold:true, color:{argb:'FFFFFFFF'} };
  h2.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
  Object.entries(stats.byCrit).forEach(([k,v]) => {
    const colors = {observation:'FFD1FAE5',mineure:'FFFFF3CD',majeure:'FFFEE2E2',critique:'FFEDE9FE'};
    const row = ws.addRow([k.charAt(0).toUpperCase()+k.slice(1), v, '', '']);
    row.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:colors[k]||'FFF3F4F6'} };
    row.height = 18;
  });

  // Répartition par service
  ws.addRow([]);
  const h3 = ws.addRow(['RÉPARTITION PAR SERVICE', '', '', '']);
  h3.font = { bold:true, color:{argb:'FFFFFFFF'} };
  h3.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
  Object.entries(stats.byService).forEach(([k,v]) => {
    const r = ws.addRow([k, v, '', '']);
    r.height = 18;
  });

  // Liste NC
  const wsNC = wb.addWorksheet('Détail NC');
  wsNC.columns = [
    {header:'Numéro NC',  key:'numero_nc',      width:16},
    {header:'Titre',      key:'titre',          width:40},
    {header:'Service',    key:'service',        width:18},
    {header:'Criticité',  key:'criticite',      width:14},
    {header:'Statut',     key:'statut',         width:14},
    {header:'Émetteur',   key:'emetteur',       width:20},
    {header:'Détection',  key:'date_detection', width:14},
  ];
  const hRow = wsNC.getRow(1);
  hRow.font = {bold:true,color:{argb:'FFFFFFFF'},size:10};
  hRow.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2E75B6'}};
  hRow.height = 22;

  rows.forEach((nc, i) => {
    wsNC.addRow({
      numero_nc:      nc.numero_nc,
      titre:          nc.titre,
      service:        nc.service_emetteur||'—',
      criticite:      nc.criticite,
      statut:         nc.statut,
      emetteur:       nc.e_prenom ? `${nc.e_prenom} ${nc.e_nom}` : '—',
      date_detection: nc.date_detection
        ? new Date(nc.date_detection).toLocaleDateString('fr-FR') : '—',
    }).height = 16;
  });

  ws.columns = [{width:30},{width:12},{width:14},{width:8}];

  return { wb, stats, nomMois, rows };
};

// Endpoint manuel
const exportRapportMensuel = async (req, res) => {
  const now = new Date();
  const mois  = parseInt(req.query.mois)  || now.getMonth() + 1;
  const annee = parseInt(req.query.annee) || now.getFullYear();

  try {
    const { wb, stats, nomMois } = await genRapportMensuel(mois, annee);

    const filename = `Innofaso_Rapport_Mensuel_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

    await log({ userId: req.user.id, action: 'EXPORT_RAPPORT_MENSUEL', ipAddress: req.ip,
                newValue: { mois, annee, stats } });
  } catch (err) {
    console.error('exportRapportMensuel error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
  }
};

// ─────────────────────────────────────────────────────────────
// CRON : déclenchement automatique le 5 de chaque mois
// appelé depuis server.js
// ─────────────────────────────────────────────────────────────
const lancerRapportAutomatique = async () => {
  const now   = new Date();
  const mois  = now.getMonth() + 1;
  const annee = now.getFullYear();
  console.log(`📊 [CRON] Génération rapport mensuel ${mois}/${annee}...`);
  try {
    const { wb, stats, nomMois } = await genRapportMensuel(mois, annee);

    // Sauvegarde locale dans /uploads/rapports/
    const fs   = require('fs');
    const path = require('path');
    const dir  = path.join(__dirname, '..', 'uploads', 'rapports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `Rapport_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
    const filepath = path.join(dir, filename);
    const buffer   = await wb.xlsx.writeBuffer();
    fs.writeFileSync(filepath, buffer);

    await log({ action: 'CRON_RAPPORT_MENSUEL',
                newValue: { mois, annee, stats, fichier: filename } });
    console.log(`✅ [CRON] Rapport sauvegardé : ${filename}`);
    console.log(`   Stats : ${stats.total} NC, taux clôture : ${stats.tauxCloture}%`);
  } catch (err) {
    console.error('❌ [CRON] Erreur rapport mensuel :', err.message);
  }
};

// GET /api/exports/stats — statistiques pour le tableau de bord
const getExportStats = async (req, res) => {
  try {
    const [total]    = await db.execute('SELECT COUNT(*) AS n FROM non_conformites');
    const [ouvertes] = await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut IN ('ouverte','en_cours')");
    const [critiques]= await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE criticite='critique' AND statut != 'cloturee'");
    const [cloturees]= await db.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut='cloturee'");
    const [byCrit]   = await db.execute('SELECT criticite, COUNT(*) AS n FROM non_conformites GROUP BY criticite');
    const [byService]= await db.execute('SELECT service_emetteur AS service, COUNT(*) AS n FROM non_conformites GROUP BY service_emetteur ORDER BY n DESC LIMIT 5');
    const [monthly]  = await db.execute(`
      SELECT DATE_FORMAT(date_detection,'%Y-%m') AS mois, COUNT(*) AS n
      FROM non_conformites
      WHERE date_detection >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mois ORDER BY mois`);

    res.json({ success: true, data: {
      total:    total[0].n,
      ouvertes: ouvertes[0].n,
      critiques:critiques[0].n,
      cloturees:cloturees[0].n,
      byCriticite: byCrit,
      byService:   byService,
      monthly:     monthly,
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

module.exports = {
  searchNC,
  exportNcPDF,
  exportNcExcel,
  exportRapportMensuel,
  lancerRapportAutomatique,
  getExportStats,
};
