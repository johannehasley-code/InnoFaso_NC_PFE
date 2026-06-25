import pool from '../db.js';
import { log } from '../models/auditLog.js';
import PDFDoc from 'pdfkit';
import ExcelJS from 'exceljs';

// ── Recherche NC avec filtres ────────────────────────────────
export const searchNC = async (req, res) => {
  try {
    let q = `SELECT nc.*,
               CONCAT(u1.prenom, ' ', u1.nom) AS emetteur
             FROM non_conformites nc
             LEFT JOIN users u1 ON nc.emetteur_id = u1.id
             WHERE 1=1`;
    const p = [];

    if (req.query.statut)    { q += ' AND nc.statut = ?';            p.push(req.query.statut); }
    if (req.query.criticite) { q += ' AND nc.criticite = ?';         p.push(req.query.criticite); }
    if (req.query.service)   { q += ' AND nc.service_emetteur = ?';  p.push(req.query.service); }
    if (req.query.search) {
      q += ' AND (nc.numero_nc LIKE ? OR nc.titre LIKE ? OR nc.description LIKE ?)';
      const s = `%${req.query.search}%`;
      p.push(s, s, s);
    }

    q += ' ORDER BY nc.created_at DESC';

    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);
    if (!Number.isNaN(limit))  q += ` LIMIT ${limit}`;
    if (!Number.isNaN(offset)) q += ` OFFSET ${offset}`;

    const [rows] = await pool.execute(q, p);

    await log({
      userId: req.user?.id || null,
      action: 'SEARCH_NC',
      ipAddress: req.ip,
      newValue: { filters: req.query, results: rows.length }
    });

    res.json({
      success: true,
      data: rows,
      meta: { total: rows.length, filters: req.query }
    });

  } catch (err) {
    console.error('searchNC error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Statistiques tableau de bord ─────────────────────────────
export const getExportStats = async (req, res) => {
  try {
    const [total]     = await pool.execute('SELECT COUNT(*) AS n FROM non_conformites');
    const [ouvertes]  = await pool.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut IN ('ouverte','en_cours')");
    const [critiques] = await pool.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE criticite='critique' AND statut != 'cloturee'");
    const [cloturees] = await pool.execute("SELECT COUNT(*) AS n FROM non_conformites WHERE statut='cloturee'");
    const [byCrit]    = await pool.execute('SELECT criticite, COUNT(*) AS n FROM non_conformites GROUP BY criticite');
    const [byService] = await pool.execute('SELECT service_emetteur AS service, COUNT(*) AS n FROM non_conformites GROUP BY service_emetteur ORDER BY n DESC LIMIT 5');

    res.json({
      success: true,
      data: {
        total: total[0].n,
        ouvertes: ouvertes[0].n,
        critiques: critiques[0].n,
        cloturees: cloturees[0].n,
        byCriticite: byCrit,
        byService: byService,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Export PDF ───────────────────────────────────────────────
export const exportNcPDF = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT nc.*, CONCAT(u1.prenom, ' ', u1.nom) AS emetteur
       FROM non_conformites nc
       LEFT JOIN users u1 ON nc.emetteur_id = u1.id
       WHERE nc.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'NC introuvable.' });
    }

    const nc = rows[0];

    const doc = new PDFDoc({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="NC_${nc.numero_nc}_${Date.now()}.pdf"`
    );

    doc.pipe(res);

    const BLUE = '#1F4E79';
    const ACCENT = '#3A7D52';
    const GREY = '#F3F4F6';
    const W = 515;

    const fmt = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';
    const textSafe = (v) =>
      (v === undefined || v === null || v === '' ? '—' : String(v));

    const refDoc = 'PM-SM-EN-FNC-E';

    doc.rect(40, 40, W, 60).fill(BLUE);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
      .text('FICHE DE NON-CONFORMITÉ', 50, 52);

    doc.fontSize(10).font('Helvetica')
      .text('INNOFASO — Système de Management de la Qualité', 50, 76);

    doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
      .text(nc.numero_nc, W - 60, 58, { align: 'right', width: 90 });

    doc.fillColor('white').fontSize(8)
      .text(`Réf. : ${refDoc}`, 50, 90);

    let y = 115;

    const row = (label, value, labelW = 160, height = 22) => {
      doc.rect(40, y, labelW, height).fill('#D6E4F0');
      doc.rect(40 + labelW, y, W - labelW, height).fill(GREY);

      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
        .text(label, 44, y + 5);

      doc.fillColor('#222').font('Helvetica')
        .text(textSafe(value), 44 + labelW, y + 5);

      y += height + 2;
    };

    const section = (title) => {
      doc.rect(40, y, W, 20).fill(ACCENT);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text(title, 44, y + 5);
      y += 24;
    };

    section('1. IDENTIFICATION');
    row('N° de fiche', nc.numero_nc);
    row('Date', fmt(nc.created_at));
    row('Émetteur', nc.emetteur);
    row('Service', nc.service_emetteur);

    doc.end();

    await log({
      userId: req.user?.id || null,
      action: 'EXPORT_NC_PDF',
      targetTable: 'non_conformites',
      targetId: req.params.id,
      ipAddress: req.ip
    });

  } catch (err) {
    console.error('exportNcPDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erreur génération PDF.' });
    }
  }
};

// ── Export Excel ─────────────────────────────────────────────
export const exportNcExcel = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT nc.numero_nc AS numero, nc.titre AS intitule, nc.service_emetteur AS service,
              nc.criticite, nc.statut
       FROM non_conformites nc
       ORDER BY nc.created_at DESC`
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Non-Conformités');

    ws.columns = [
      { header: 'Numéro', key: 'numero' },
      { header: 'Intitulé', key: 'intitule' },
      { header: 'Service', key: 'service' },
      { header: 'Criticité', key: 'criticite' },
      { header: 'Statut', key: 'statut' },
    ];

    rows.forEach(r => ws.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="NC_${Date.now()}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();

    await log({
      userId: req.user?.id || null,
      action: 'EXPORT_NC_EXCEL',
      ipAddress: req.ip,
      newValue: { count: rows.length }
    });

  } catch (err) {
    console.error('exportNcExcel error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erreur génération Excel.' });
    }
  }
};

// ── Rapport mensuel ──────────────────────────────────────────
export const exportRapportMensuel = async (req, res) => {
  try {
    const mois = parseInt(req.query.mois) || new Date().getMonth() + 1;
    const annee = parseInt(req.query.annee) || new Date().getFullYear();

    const debut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const fin = `${annee}-${String(mois).padStart(2, '0')}-31`;

    const [rows] = await pool.execute(
      `SELECT numero_nc AS numero, titre AS intitule, service_emetteur AS service, statut
       FROM non_conformites
       WHERE created_at BETWEEN ? AND ?`,
      [debut, fin]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rapport Mensuel');

    ws.addRow(['Rapport mensuel']);
    ws.addRow([`Mois: ${mois}/${annee}`]);
    ws.addRow([]);

    rows.forEach(r => ws.addRow([
      r.numero,
      r.intitule,
      r.service,
      r.statut
    ]));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport_${mois}_${annee}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();

    await log({
      userId: req.user?.id || null,
      action: 'EXPORT_RAPPORT_MENSUEL',
      ipAddress: req.ip,
      newValue: { mois, annee, total: rows.length }
    });

  } catch (err) {
    console.error('exportRapportMensuel error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
    }
  }
};