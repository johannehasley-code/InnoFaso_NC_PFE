// // import pool from '../db.js';
// // import { log } from '../models/auditLog.js';
// // import PDFDoc from 'pdfkit';
// // import ExcelJS from 'exceljs';

// // // ── Recherche NC avec filtres ────────────────────────────────
// // export const searchNC = async (req, res) => {
// //   try {
// //     let q = 'SELECT * FROM nc WHERE 1=1';
// //     const p = [];

// //     if (req.query.statut)    { q += ' AND statut = ?';    p.push(req.query.statut); }
// //     if (req.query.criticite) { q += ' AND criticite = ?'; p.push(req.query.criticite); }
// //     if (req.query.service)   { q += ' AND service = ?';   p.push(req.query.service); }
// //     if (req.query.search) {
// //       q += ' AND (numero LIKE ? OR intitule LIKE ? OR description LIKE ?)';
// //       const s = `%${req.query.search}%`;
// //       p.push(s, s, s);
// //     }

// //     q += ' ORDER BY cree_le DESC';
// //     if (req.query.limit)  { q += ' LIMIT ?';  p.push(parseInt(req.query.limit)); }
// //     if (req.query.offset) { q += ' OFFSET ?'; p.push(parseInt(req.query.offset)); }

// //     const [rows] = await pool.execute(q, p);

// //     await log({ userId: req.user.id, action: 'SEARCH_NC', ipAddress: req.ip,
// //                 newValue: { filters: req.query, results: rows.length } });

// //     res.json({ success: true, data: rows, meta: { total: rows.length, filters: req.query } });
// //   } catch (err) {
// //     console.error('searchNC error:', err);
// //     res.status(500).json({ success: false, message: 'Erreur serveur.' });
// //   }
// // };

// // // ── Statistiques tableau de bord ─────────────────────────────
// // export const getExportStats = async (req, res) => {
// //   try {
// //     const [total]     = await pool.execute('SELECT COUNT(*) AS n FROM nc');
// //     const [ouvertes]  = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut IN ('ouverte','en_cours')");
// //     const [critiques] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE criticite='critique' AND statut != 'cloturee'");
// //     const [cloturees] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut='cloturee'");
// //     const [byCrit]    = await pool.execute('SELECT criticite, COUNT(*) AS n FROM nc GROUP BY criticite');
// //     const [byService] = await pool.execute('SELECT service, COUNT(*) AS n FROM nc GROUP BY service ORDER BY n DESC LIMIT 5');

// //     res.json({ success: true, data: {
// //       total:       total[0].n,
// //       ouvertes:    ouvertes[0].n,
// //       critiques:   critiques[0].n,
// //       cloturees:   cloturees[0].n,
// //       byCriticite: byCrit,
// //       byService:   byService,
// //     }});
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ success: false, message: 'Erreur serveur.' });
// //   }
// // };

// // // ── Export PDF fiche NC ───────────────────────────────────────
// // export const exportNcPDF = async (req, res) => {
// //   try {
// //     const [rows] = await pool.execute('SELECT * FROM nc WHERE id = ?', [req.params.id]);
// //     if (!rows.length)
// //       return res.status(404).json({ success: false, message: 'NC introuvable.' });

// //     const nc = rows[0];
// //     const analyse  = typeof nc.analyse  === 'string' ? JSON.parse(nc.analyse)  : nc.analyse  || {};
// //     const capa     = typeof nc.capa     === 'string' ? JSON.parse(nc.capa)     : nc.capa     || { actions: [] };
// //     const cloture  = typeof nc.cloture  === 'string' ? JSON.parse(nc.cloture)  : nc.cloture  || {};
// //     const assigneA = typeof nc.assigne_a=== 'string' ? JSON.parse(nc.assigne_a): nc.assigne_a || null;

// //     const doc = new PDFDoc({ size: 'A4', margin: 40 });
// //     res.setHeader('Content-Type', 'application/pdf');
// //     res.setHeader('Content-Disposition',
// //       `attachment; filename="NC_${nc.numero}_${Date.now()}.pdf"`);
// //     doc.pipe(res);

// //     const BLUE = '#1F4E79'; const ACCENT = '#3A7D52'; const GREY = '#F3F4F6';
// //     const W = 515;
// //     const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// //     // En-tête
// //     doc.rect(40, 40, W, 60).fill(BLUE);
// //     doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
// //        .text('FICHE DE NON-CONFORMITÉ', 50, 52);
// //     doc.fontSize(10).font('Helvetica')
// //        .text('INNOFASO — Système de Management de la Qualité', 50, 76);
// //     doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
// //        .text(nc.numero, W - 60, 58, { align: 'right', width: 90 });

// //     doc.moveDown(4.5);

// //     const cellRow = (label, value, y, labelW = 160) => {
// //       doc.rect(40, y, labelW, 22).fill('#D6E4F0');
// //       doc.rect(40 + labelW, y, W - labelW, 22).fill(GREY);
// //       doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
// //          .text(label, 44, y + 7, { width: labelW - 8 });
// //       doc.fillColor('#222').font('Helvetica')
// //          .text(String(value || '—'), 44 + labelW, y + 7, { width: W - labelW - 8 });
// //     };

// //     const section = (title, y) => {
// //       doc.rect(40, y, W, 20).fill(ACCENT);
// //       doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 44, y + 5);
// //       return y + 20;
// //     };

// //     let y = 115;
// //     y = section('1. IDENTIFICATION', y);
// //     cellRow('Numéro NC', nc.numero, y); y += 24;
// //     cellRow('Date création', fmt(nc.cree_le), y); y += 24;
// //     cellRow('Service', nc.service, y); y += 24;
// //     cellRow('Émetteur', nc.emetteur, y); y += 24;
// //     cellRow('Criticité', nc.criticite?.toUpperCase(), y); y += 24;
// //     cellRow('Statut', nc.statut?.toUpperCase(), y); y += 28;

// //     y = section('2. DESCRIPTION', y);
// //     cellRow('Intitulé', nc.intitule, y); y += 24;
// //     doc.rect(40, y, 160, 60).fill('#D6E4F0');
// //     doc.rect(200, y, W - 160, 60).fill(GREY);
// //     doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text('Description', 44, y + 4);
// //     doc.fillColor('#222').font('Helvetica').fontSize(9)
// //        .text(nc.description || '—', 204, y + 4, { width: W - 168, height: 52, ellipsis: true });
// //     y += 68;

// //     y = section('3. ANALYSE 5M', y);
// //     const cinqM = analyse.cinqM || {};
// //     [["Main d'œuvre", cinqM.mainOeuvre], ['Méthode', cinqM.methode],
// //      ['Matériel', cinqM.materiel], ['Milieu', cinqM.milieu], ['Matière', cinqM.matiere]
// //     ].forEach(([l, v]) => { cellRow(l, v, y); y += 24; });
// //     y += 4;

// //     y = section('4. PLAN CAPA', y);
// //     const actions = capa.actions || [];
// //     if (actions.length === 0) {
// //       cellRow('Actions', 'Aucune action définie', y); y += 24;
// //     } else {
// //       actions.forEach((a, i) => {
// //         cellRow(`Action ${i+1}`, `${a.libelle || '—'} — ${a.responsable?.nom || '—'} — ${a.echeance || '—'}`, y);
// //         y += 24;
// //       });
// //     }
// //     y += 4;

// //     y = section('5. CLÔTURE', y);
// //     cellRow('Efficacité', cloture.efficacite, y); y += 24;
// //     cellRow('Signature RQ', cloture.signatureRQ, y); y += 28;

// //     // Pied de page
// //     doc.rect(40, y + 4, W, 20).fill(ACCENT);
// //     doc.fillColor('white').fontSize(8).font('Helvetica')
// //        .text(`Innofaso © ${new Date().getFullYear()} — Généré le ${new Date().toLocaleString('fr-FR')} — Réf. : ${nc.numero}`, 44, y + 10);

// //     doc.end();

// //     await log({ userId: req.user.id, action: 'EXPORT_NC_PDF',
// //                 targetTable: 'nc', targetId: req.params.id, ipAddress: req.ip });

// //   } catch (err) {
// //     console.error('exportNcPDF error:', err);
// //     if (!res.headersSent)
// //       res.status(500).json({ success: false, message: 'Erreur génération PDF.' });
// //   }
// // };

// // // ── Export Excel liste NC ─────────────────────────────────────
// // export const exportNcExcel = async (req, res) => {
// //   try {
// //     const [rows] = await pool.execute('SELECT * FROM nc ORDER BY cree_le DESC');

// //     const wb = new ExcelJS.Workbook();
// //     wb.creator = 'Innofaso SMQ'; wb.created = new Date();
// //     const ws = wb.addWorksheet('Non-Conformités', {
// //       pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
// //     });

// //     ws.mergeCells('A1:H1');
// //     ws.getCell('A1').value = 'INNOFASO — Liste des Non-Conformités';
// //     ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
// //     ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
// //     ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
// //     ws.getRow(1).height = 28;

// //     ws.mergeCells('A2:H2');
// //     ws.getCell('A2').value = `Exporté le ${new Date().toLocaleString('fr-FR')}`;
// //     ws.getCell('A2').font  = { italic: true, size: 9, color: { argb: 'FF666666' } };
// //     ws.getCell('A2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
// //     ws.getRow(2).height = 16;

// //     const COLS = [
// //       { header: 'Numéro NC',   key: 'numero',      width: 18 },
// //       { header: 'Intitulé',    key: 'intitule',    width: 40 },
// //       { header: 'Service',     key: 'service',     width: 18 },
// //       { header: 'Criticité',   key: 'criticite',   width: 14 },
// //       { header: 'Statut',      key: 'statut',      width: 14 },
// //       { header: 'Émetteur',    key: 'emetteur',    width: 22 },
// //       { header: 'Date création', key: 'cree_le',   width: 18 },
// //       { header: 'Description', key: 'description', width: 50 },
// //     ];
// //     ws.columns = COLS;

// //     const headerRow = ws.getRow(3);
// //     COLS.forEach((c, i) => {
// //       const cell = headerRow.getCell(i + 1);
// //       cell.value = c.header;
// //       cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
// //       cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D52' } };
// //       cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
// //     });
// //     headerRow.height = 24;

// //     const CRIT_COLORS = {
// //       faible: { argb: 'FFD1FAE5' }, moyenne: { argb: 'FFFFF3CD' },
// //       elevee: { argb: 'FFFEE2E2' }, critique: { argb: 'FFEDE9FE' },
// //     };

// //     rows.forEach((nc, idx) => {
// //       const r = ws.addRow({
// //         numero:      nc.numero,
// //         intitule:    nc.intitule,
// //         service:     nc.service || '—',
// //         criticite:   nc.criticite,
// //         statut:      nc.statut,
// //         emetteur:    nc.emetteur || '—',
// //         cree_le:     new Date(nc.cree_le).toLocaleString('fr-FR'),
// //         description: nc.description || '—',
// //       });

// //       const rowBg  = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
// //       const critBg = CRIT_COLORS[nc.criticite]?.argb || rowBg;
// //       r.eachCell((cell, colNum) => {
// //         cell.font      = { size: 9 };
// //         cell.alignment = { vertical: 'middle', wrapText: colNum === 2 || colNum === 8 };
// //         cell.fill      = { type: 'pattern', pattern: 'solid',
// //                            fgColor: { argb: colNum === 4 ? critBg : rowBg } };
// //         cell.border    = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
// //       });
// //       r.height = 18;
// //     });

// //     const filename = `Innofaso_NC_${new Date().toISOString().slice(0,10)}.xlsx`;
// //     res.setHeader('Content-Type',
// //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// //     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
// //     await wb.xlsx.write(res);
// //     res.end();

// //     await log({ userId: req.user.id, action: 'EXPORT_NC_EXCEL', ipAddress: req.ip,
// //                 newValue: { count: rows.length } });

// //   } catch (err) {
// //     console.error('exportNcExcel error:', err);
// //     if (!res.headersSent)
// //       res.status(500).json({ success: false, message: 'Erreur génération Excel.' });
// //   }
// // };

// // // ── Rapport mensuel ───────────────────────────────────────────
// // export const exportRapportMensuel = async (req, res) => {
// //   const now   = new Date();
// //   const mois  = parseInt(req.query.mois)  || now.getMonth() + 1;
// //   const annee = parseInt(req.query.annee) || now.getFullYear();
// //   const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
// //   const fin   = `${annee}-${String(mois).padStart(2,'0')}-${new Date(annee, mois, 0).getDate()}`;

// //   try {
// //     const [rows] = await pool.execute(
// //       'SELECT * FROM nc WHERE cree_le BETWEEN ? AND ? ORDER BY criticite DESC, cree_le DESC',
// //       [debut, fin + ' 23:59:59']
// //     );

// //     const wb = new ExcelJS.Workbook();
// //     const ws = wb.addWorksheet('Rapport Mensuel');
// //     const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR', { month:'long', year:'numeric' });

// //     ws.mergeCells('A1:D1');
// //     ws.getCell('A1').value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
// //     ws.getCell('A1').font  = { bold:true, size:14, color:{argb:'FFFFFFFF'} };
// //     ws.getCell('A1').fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
// //     ws.getRow(1).height = 30;

// //     const byStatut = {}; const byCrit = {};
// //     rows.forEach(r => {
// //       byStatut[r.statut]   = (byStatut[r.statut]   || 0) + 1;
// //       byCrit[r.criticite]  = (byCrit[r.criticite]  || 0) + 1;
// //     });

// //     const cloturees = byStatut['cloturee'] || 0;
// //     const tauxCloture = rows.length ? Math.round(cloturees / rows.length * 100) : 0;

// //     [
// //       ['Total NC', rows.length],
// //       ['NC clôturées', cloturees],
// //       [`Taux clôture`, `${tauxCloture}%`],
// //       ...Object.entries(byStatut).map(([k,v]) => [`Statut : ${k}`, v]),
// //       ...Object.entries(byCrit).map(([k,v])   => [`Criticité : ${k}`, v]),
// //       ['Date export', new Date().toLocaleString('fr-FR')],
// //     ].forEach(([label, value]) => ws.addRow([label, value]));

// //     const filename = `Innofaso_Rapport_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
// //     res.setHeader('Content-Type',
// //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// //     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
// //     await wb.xlsx.write(res);
// //     res.end();

// //     await log({ userId: req.user.id, action: 'EXPORT_RAPPORT_MENSUEL', ipAddress: req.ip,
// //                 newValue: { mois, annee, total: rows.length } });

// //   } catch (err) {
// //     console.error('exportRapportMensuel error:', err);
// //     if (!res.headersSent)
// //       res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
// //   }
// // };


// import pool from '../db.js';
// import { log } from '../models/auditLog.js';
// import PDFDoc from 'pdfkit';
// import ExcelJS from 'exceljs';

// // ── Recherche NC avec filtres ────────────────────────────────
// export const searchNC = async (req, res) => {
//   try {
//     let q = 'SELECT * FROM nc WHERE 1=1';
//     const p = [];

//     if (req.query.statut)    { q += ' AND statut = ?';    p.push(req.query.statut); }
//     if (req.query.criticite) { q += ' AND criticite = ?'; p.push(req.query.criticite); }
//     if (req.query.service)   { q += ' AND service = ?';   p.push(req.query.service); }
//     if (req.query.search) {
//       q += ' AND (numero LIKE ? OR intitule LIKE ? OR description LIKE ?)';
//       const s = `%${req.query.search}%`;
//       p.push(s, s, s);
//     }

//     q += ' ORDER BY cree_le DESC';
//     if (req.query.limit)  { q += ' LIMIT ?';  p.push(parseInt(req.query.limit)); }
//     if (req.query.offset) { q += ' OFFSET ?'; p.push(parseInt(req.query.offset)); }

//     const [rows] = await pool.execute(q, p);

//     await log({ userId: req.user.id, action: 'SEARCH_NC', ipAddress: req.ip,
//                 newValue: { filters: req.query, results: rows.length } });

//     res.json({ success: true, data: rows, meta: { total: rows.length, filters: req.query } });
//   } catch (err) {
//     console.error('searchNC error:', err);
//     res.status(500).json({ success: false, message: 'Erreur serveur.' });
//   }
// };

// // ── Statistiques tableau de bord ─────────────────────────────
// export const getExportStats = async (req, res) => {
//   try {
//     const [total]     = await pool.execute('SELECT COUNT(*) AS n FROM nc');
//     const [ouvertes]  = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut IN ('ouverte','en_cours')");
//     const [critiques] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE criticite='critique' AND statut != 'cloturee'");
//     const [cloturees] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut='cloturee'");
//     const [byCrit]    = await pool.execute('SELECT criticite, COUNT(*) AS n FROM nc GROUP BY criticite');
//     const [byService] = await pool.execute('SELECT service, COUNT(*) AS n FROM nc GROUP BY service ORDER BY n DESC LIMIT 5');

//     res.json({ success: true, data: {
//       total:       total[0].n,
//       ouvertes:    ouvertes[0].n,
//       critiques:   critiques[0].n,
//       cloturees:   cloturees[0].n,
//       byCriticite: byCrit,
//       byService:   byService,
//     }});
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Erreur serveur.' });
//   }
// };

// // ── Export PDF fiche NC ───────────────────────────────────────
// export const exportNcPDF = async (req, res) => {
//   try {
//     const [rows] = await pool.execute('SELECT * FROM nc WHERE id = ?', [req.params.id]);
//     if (!rows.length)
//       return res.status(404).json({ success: false, message: 'NC introuvable.' });

//     const nc = rows[0];
//     const analyse  = typeof nc.analyse  === 'string' ? JSON.parse(nc.analyse)  : nc.analyse  || {};
//     const capa     = typeof nc.capa     === 'string' ? JSON.parse(nc.capa)     : nc.capa     || { actions: [] };
//     const cloture  = typeof nc.cloture  === 'string' ? JSON.parse(nc.cloture)  : nc.cloture  || {};
//     const assigneA = typeof nc.assigne_a=== 'string' ? JSON.parse(nc.assigne_a): nc.assigne_a || null;

//     const doc = new PDFDoc({ size: 'A4', margin: 40 });
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition',
//       `attachment; filename="NC_${nc.numero}_${Date.now()}.pdf"`);
//     doc.pipe(res);

//     const BLUE = '#1F4E79'; const ACCENT = '#3A7D52'; const GREY = '#F3F4F6';
//     const W = 515;
//     const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

//     // En-tête
//     doc.rect(40, 40, W, 60).fill(BLUE);
//     doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
//        .text('FICHE DE NON-CONFORMITÉ', 50, 52);
//     doc.fontSize(10).font('Helvetica')
//        .text('INNOFASO — Système de Management de la Qualité', 50, 76);
//     doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
//        .text(nc.numero, W - 60, 58, { align: 'right', width: 90 });

//     doc.moveDown(4.5);

//     const cellRow = (label, value, y, labelW = 160) => {
//       doc.rect(40, y, labelW, 22).fill('#D6E4F0');
//       doc.rect(40 + labelW, y, W - labelW, 22).fill(GREY);
//       doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
//          .text(label, 44, y + 7, { width: labelW - 8 });
//       doc.fillColor('#222').font('Helvetica')
//          .text(String(value || '—'), 44 + labelW, y + 7, { width: W - labelW - 8 });
//     };

//     const section = (title, y) => {
//       doc.rect(40, y, W, 20).fill(ACCENT);
//       doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 44, y + 5);
//       return y + 20;
//     };

//     let y = 115;
//     y = section('1. IDENTIFICATION', y);
//     cellRow('Numéro NC', nc.numero, y); y += 24;
//     cellRow('Date création', fmt(nc.cree_le), y); y += 24;
//     cellRow('Service', nc.service, y); y += 24;
//     cellRow('Émetteur', nc.emetteur, y); y += 24;
//     cellRow('Criticité', nc.criticite?.toUpperCase(), y); y += 24;
//     cellRow('Statut', nc.statut?.toUpperCase(), y); y += 28;

//     y = section('2. DESCRIPTION', y);
//     cellRow('Intitulé', nc.intitule, y); y += 24;
//     doc.rect(40, y, 160, 60).fill('#D6E4F0');
//     doc.rect(200, y, W - 160, 60).fill(GREY);
//     doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text('Description', 44, y + 4);
//     doc.fillColor('#222').font('Helvetica').fontSize(9)
//        .text(nc.description || '—', 204, y + 4, { width: W - 168, height: 52, ellipsis: true });
//     y += 68;

//     y = section('3. ANALYSE 5M', y);
//     const cinqM = analyse.cinqM || {};
//     [["Main d'œuvre", cinqM.mainOeuvre], ['Méthode', cinqM.methode],
//      ['Matériel', cinqM.materiel], ['Milieu', cinqM.milieu], ['Matière', cinqM.matiere]
//     ].forEach(([l, v]) => { cellRow(l, v, y); y += 24; });
//     y += 4;

//     y = section('4. PLAN CAPA', y);
//     const actions = capa.actions || [];
//     if (actions.length === 0) {
//       cellRow('Actions', 'Aucune action définie', y); y += 24;
//     } else {
//       actions.forEach((a, i) => {
//         cellRow(`Action ${i+1}`, `${a.libelle || '—'} — ${a.responsable?.nom || '—'} — ${a.echeance || '—'}`, y);
//         y += 24;
//       });
//     }
//     y += 4;

//     y = section('5. CLÔTURE', y);
//     cellRow('Efficacité', cloture.efficacite, y); y += 24;
//     cellRow('Signature RQ', cloture.signatureRQ, y); y += 28;

//     // Pied de page
//     doc.rect(40, y + 4, W, 20).fill(ACCENT);
//     doc.fillColor('white').fontSize(8).font('Helvetica')
//        .text(`Innofaso © ${new Date().getFullYear()} — Généré le ${new Date().toLocaleString('fr-FR')} — Réf. : ${nc.numero}`, 44, y + 10);

//     doc.end();

//     await log({ userId: req.user.id, action: 'EXPORT_NC_PDF',
//                 targetTable: 'nc', targetId: req.params.id, ipAddress: req.ip });

//   } catch (err) {
//     console.error('exportNcPDF error:', err);
//     if (!res.headersSent)
//       res.status(500).json({ success: false, message: 'Erreur génération PDF.' });
//   }
// };

// // ── Export Excel liste NC ─────────────────────────────────────
// export const exportNcExcel = async (req, res) => {
//   try {
//     const [rows] = await pool.execute('SELECT * FROM nc ORDER BY cree_le DESC');

//     const wb = new ExcelJS.Workbook();
//     wb.creator = 'Innofaso SMQ'; wb.created = new Date();
//     const ws = wb.addWorksheet('Non-Conformités', {
//       pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
//     });

//     ws.mergeCells('A1:H1');
//     ws.getCell('A1').value = 'INNOFASO — Liste des Non-Conformités';
//     ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
//     ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
//     ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
//     ws.getRow(1).height = 28;

//     ws.mergeCells('A2:H2');
//     ws.getCell('A2').value = `Exporté le ${new Date().toLocaleString('fr-FR')}`;
//     ws.getCell('A2').font  = { italic: true, size: 9, color: { argb: 'FF666666' } };
//     ws.getCell('A2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
//     ws.getRow(2).height = 16;

//     const COLS = [
//       { header: 'Numéro NC',   key: 'numero',      width: 18 },
//       { header: 'Intitulé',    key: 'intitule',    width: 40 },
//       { header: 'Service',     key: 'service',     width: 18 },
//       { header: 'Criticité',   key: 'criticite',   width: 14 },
//       { header: 'Statut',      key: 'statut',      width: 14 },
//       { header: 'Émetteur',    key: 'emetteur',    width: 22 },
//       { header: 'Date création', key: 'cree_le',   width: 18 },
//       { header: 'Description', key: 'description', width: 50 },
//     ];
//     ws.columns = COLS;

//     const headerRow = ws.getRow(3);
//     COLS.forEach((c, i) => {
//       const cell = headerRow.getCell(i + 1);
//       cell.value = c.header;
//       cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
//       cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D52' } };
//       cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
//     });
//     headerRow.height = 24;

//     const CRIT_COLORS = {
//       faible: { argb: 'FFD1FAE5' }, moyenne: { argb: 'FFFFF3CD' },
//       elevee: { argb: 'FFFEE2E2' }, critique: { argb: 'FFEDE9FE' },
//     };

//     rows.forEach((nc, idx) => {
//       const r = ws.addRow({
//         numero:      nc.numero,
//         intitule:    nc.intitule,
//         service:     nc.service || '—',
//         criticite:   nc.criticite,
//         statut:      nc.statut,
//         emetteur:    nc.emetteur || '—',
//         cree_le:     new Date(nc.cree_le).toLocaleString('fr-FR'),
//         description: nc.description || '—',
//       });

//       const rowBg  = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
//       const critBg = CRIT_COLORS[nc.criticite]?.argb || rowBg;
//       r.eachCell((cell, colNum) => {
//         cell.font      = { size: 9 };
//         cell.alignment = { vertical: 'middle', wrapText: colNum === 2 || colNum === 8 };
//         cell.fill      = { type: 'pattern', pattern: 'solid',
//                            fgColor: { argb: colNum === 4 ? critBg : rowBg } };
//         cell.border    = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
//       });
//       r.height = 18;
//     });

//     const filename = `Innofaso_NC_${new Date().toISOString().slice(0,10)}.xlsx`;
//     res.setHeader('Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//     await wb.xlsx.write(res);
//     res.end();

//     await log({ userId: req.user.id, action: 'EXPORT_NC_EXCEL', ipAddress: req.ip,
//                 newValue: { count: rows.length } });

//   } catch (err) {
//     console.error('exportNcExcel error:', err);
//     if (!res.headersSent)
//       res.status(500).json({ success: false, message: 'Erreur génération Excel.' });
//   }
// };

// // ── Rapport mensuel ───────────────────────────────────────────
// export const exportRapportMensuel = async (req, res) => {
//   const now   = new Date();
//   const mois  = parseInt(req.query.mois)  || now.getMonth() + 1;
//   const annee = parseInt(req.query.annee) || now.getFullYear();
//   const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
//   const fin   = `${annee}-${String(mois).padStart(2,'0')}-${new Date(annee, mois, 0).getDate()}`;

//   try {
//     const [rows] = await pool.execute(
//       'SELECT * FROM nc WHERE cree_le BETWEEN ? AND ? ORDER BY criticite DESC, cree_le DESC',
//       [debut, fin + ' 23:59:59']
//     );

//     const filtered = rows.filter((r) => String(r.statut || '').toLowerCase() !== 'brouillon');
//     const total = filtered.length;
//     const cloturees = filtered.filter((r) => String(r.statut || '').toLowerCase() === 'cloturee').length;
//     const tauxCloture = total ? Math.round(cloturees / total * 100) : 0;

//     const keyOf = (value) => {
//       const normalized = String(value || '').trim();
//       return normalized.length ? normalized : 'Non renseigné';
//     };

//     const addStats = (map, key, closed) => {
//       if (!map[key]) map[key] = { count: 0, closed: 0 };
//       map[key].count += 1;
//       if (closed) map[key].closed += 1;
//     };

//     const serviceStats = {};
//     const productStats = {};
//     const matiereStats = {};
//     const statusStats = {};
//     const criticiteStats = {};

//     filtered.forEach((r) => {
//       const statut = keyOf(r.statut);
//       const criticite = keyOf(r.criticite);
//       const service = keyOf(r.service || r.service_emetteur);
//       const produit = keyOf(r.nomProduit || r.nom_produit || r.sousType || 'Non renseigné');
//       const matiereKey = String(r.sousType || '').toLowerCase().includes('matiere')
//         ? keyOf(r.nomProduit || r.matiere || 'Non renseigné')
//         : (String(r.matiere || '').trim().length ? keyOf(r.matiere) : null);

//       const isClosed = statut === 'cloturee';
//       addStats(statusStats, statut, isClosed);
//       addStats(criticiteStats, criticite, isClosed);
//       addStats(serviceStats, service, isClosed);
//       addStats(productStats, produit, isClosed);
//       if (matiereKey) addStats(matiereStats, matiereKey, isClosed);
//     });

//     const wb = new ExcelJS.Workbook();
//     const ws = wb.addWorksheet('Rapport Mensuel');
//     const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR', { month:'long', year:'numeric' });

//     ws.columns = [
//       { header: 'Libellé', key: 'label', width: 32 },
//       { header: 'NC', key: 'count', width: 12 },
//       { header: 'Clôturées', key: 'closed', width: 14 },
//       { header: 'Taux', key: 'rate', width: 14 },
//     ];

//     const makeSectionTitle = (title) => {
//       const row = ws.addRow([title]);
//       ws.mergeCells(`A${row.number}:D${row.number}`);
//       row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
//       row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D52' } };
//       row.alignment = { horizontal: 'left', vertical: 'middle' };
//       row.height = 22;
//       ws.addRow([]);
//     };

//     const addMetricRow = (label, value) => {
//       const row = ws.addRow([label, value]);
//       row.getCell(1).font = { bold: true };
//       return row;
//     };

//     const addTable = (title, entries, includeRate = true) => {
//       makeSectionTitle(title);
//       const headerRow = ws.addRow(['', 'NC', 'Clôturées', 'Taux clôture']);
//       headerRow.font = { bold: true };
//       headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
//       headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
//       headerRow.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0B7C3' } } }; });

//       entries.forEach(([label, stats]) => {
//         const rate = stats.count ? `${Math.round((stats.closed / stats.count) * 100)}%` : '0%';
//         const row = ws.addRow([label, stats.count, stats.closed, includeRate ? rate : '']);
//         row.getCell(2).alignment = { horizontal: 'center' };
//         row.getCell(3).alignment = { horizontal: 'center' };
//         row.getCell(4).alignment = { horizontal: 'center' };
//       });
//       ws.addRow([]);
//     };

//     ws.mergeCells('A1:D1');
//     const titleRow = ws.getRow(1);
//     titleRow.getCell(1).value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
//     titleRow.font = { bold:true, size:14, color:{argb:'FFFFFFFF'} };
//     titleRow.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
//     titleRow.alignment = { horizontal:'left', vertical:'middle' };
//     ws.getRow(1).height = 30;
//     ws.addRow([]);

//     addMetricRow('Total NC', total);
//     addMetricRow('NC clôturées', cloturees);
//     addMetricRow('Taux de clôture général', `${tauxCloture}%`);
//     ws.addRow([]);

//     const sortStats = (map) => Object.entries(map).sort((a,b) => b[1].count - a[1].count);

//     addTable('Taux de clôture par service', sortStats(serviceStats));
//     addTable('Taux de clôture par produit', sortStats(productStats));
//     addTable('Taux de clôture par matière', sortStats(matiereStats));

//     const statusEntries = Object.entries(statusStats)
//       .filter(([label]) => String(label).toLowerCase() !== 'brouillon')
//       .sort((a,b) => b[1].count - a[1].count);
//     addTable('Taux par statut', statusEntries);

//     const criticiteEntries = Object.entries(criticiteStats)
//       .sort((a,b) => b[1].count - a[1].count);
//     addTable('Taux par criticité', criticiteEntries);

//     ws.addRow([]);
//     addMetricRow('Date export', new Date().toLocaleString('fr-FR'));

//     const filename = `Innofaso_Rapport_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
//     res.setHeader('Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//     await wb.xlsx.write(res);
//     res.end();

//     await log({ userId: req.user.id, action: 'EXPORT_RAPPORT_MENSUEL', ipAddress: req.ip,
//                 newValue: { mois, annee, total } });

//   } catch (err) {
//     console.error('exportRapportMensuel error:', err);
//     if (!res.headersSent)
//       res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
//   }
// };


import pool from '../db.js';
import { log } from '../models/auditLog.js';
import PDFDoc from 'pdfkit';
import ExcelJS from 'exceljs';

// ── Recherche NC avec filtres ────────────────────────────────
export const searchNC = async (req, res) => {
  try {
    let q = 'SELECT * FROM nc WHERE 1=1';
    const p = [];

    if (req.query.statut)    { q += ' AND statut = ?';    p.push(req.query.statut); }
    if (req.query.criticite) { q += ' AND criticite = ?'; p.push(req.query.criticite); }
    if (req.query.service)   { q += ' AND service = ?';   p.push(req.query.service); }
    if (req.query.search) {
      q += ' AND (numero LIKE ? OR intitule LIKE ? OR description LIKE ?)';
      const s = `%${req.query.search}%`;
      p.push(s, s, s);
    }

    q += ' ORDER BY cree_le DESC';
    if (req.query.limit)  { q += ' LIMIT ?';  p.push(parseInt(req.query.limit)); }
    if (req.query.offset) { q += ' OFFSET ?'; p.push(parseInt(req.query.offset)); }

    const [rows] = await pool.execute(q, p);

    await log({ userId: req.user.id, action: 'SEARCH_NC', ipAddress: req.ip,
                newValue: { filters: req.query, results: rows.length } });

    res.json({ success: true, data: rows, meta: { total: rows.length, filters: req.query } });
  } catch (err) {
    console.error('searchNC error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Statistiques tableau de bord ─────────────────────────────
export const getExportStats = async (req, res) => {
  try {
    const [total]     = await pool.execute('SELECT COUNT(*) AS n FROM nc');
    const [ouvertes]  = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut IN ('ouverte','en_cours')");
    const [critiques] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE criticite='critique' AND statut != 'cloturee'");
    const [cloturees] = await pool.execute("SELECT COUNT(*) AS n FROM nc WHERE statut='cloturee'");
    const [byCrit]    = await pool.execute('SELECT criticite, COUNT(*) AS n FROM nc GROUP BY criticite');
    const [byService] = await pool.execute('SELECT service, COUNT(*) AS n FROM nc GROUP BY service ORDER BY n DESC LIMIT 5');

    res.json({ success: true, data: {
      total:       total[0].n,
      ouvertes:    ouvertes[0].n,
      critiques:   critiques[0].n,
      cloturees:   cloturees[0].n,
      byCriticite: byCrit,
      byService:   byService,
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ── Export PDF fiche NC ───────────────────────────────────────
export const exportNcPDF = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM nc WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'NC introuvable.' });

    const nc = rows[0];
    const analyse  = typeof nc.analyse  === 'string' ? JSON.parse(nc.analyse)  : nc.analyse  || {};
    const capa     = typeof nc.capa     === 'string' ? JSON.parse(nc.capa)     : nc.capa     || { actions: [] };
    const cloture  = typeof nc.cloture  === 'string' ? JSON.parse(nc.cloture)  : nc.cloture  || {};
    const assigneA = typeof nc.assigne_a=== 'string' ? JSON.parse(nc.assigne_a): nc.assigne_a || null;

    const doc = new PDFDoc({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="NC_${nc.numero}_${Date.now()}.pdf"`);
    doc.pipe(res);

    const BLUE = '#1F4E79'; const ACCENT = '#3A7D52'; const GREY = '#F3F4F6';
    const W = 515;
    const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

    // En-tête
    doc.rect(40, 40, W, 60).fill(BLUE);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text('FICHE DE NON-CONFORMITÉ', 50, 52);
    doc.fontSize(10).font('Helvetica')
       .text('INNOFASO — Système de Management de la Qualité', 50, 76);
    doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
       .text(nc.numero, W - 60, 58, { align: 'right', width: 90 });

    doc.moveDown(4.5);

    const cellRow = (label, value, y, labelW = 160) => {
      doc.rect(40, y, labelW, 22).fill('#D6E4F0');
      doc.rect(40 + labelW, y, W - labelW, 22).fill(GREY);
      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
         .text(label, 44, y + 7, { width: labelW - 8 });
      doc.fillColor('#222').font('Helvetica')
         .text(String(value || '—'), 44 + labelW, y + 7, { width: W - labelW - 8 });
    };

    const section = (title, y) => {
      doc.rect(40, y, W, 20).fill(ACCENT);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 44, y + 5);
      return y + 20;
    };

    let y = 115;
    y = section('1. IDENTIFICATION', y);
    cellRow('Numéro NC', nc.numero, y); y += 24;
    cellRow('Date création', fmt(nc.cree_le), y); y += 24;
    cellRow('Service', nc.service, y); y += 24;
    cellRow('Émetteur', nc.emetteur, y); y += 24;
    cellRow('Criticité', nc.criticite?.toUpperCase(), y); y += 24;
    cellRow('Statut', nc.statut?.toUpperCase(), y); y += 28;

    y = section('2. DESCRIPTION', y);
    cellRow('Intitulé', nc.intitule, y); y += 24;
    doc.rect(40, y, 160, 60).fill('#D6E4F0');
    doc.rect(200, y, W - 160, 60).fill(GREY);
    doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold').text('Description', 44, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(nc.description || '—', 204, y + 4, { width: W - 168, height: 52, ellipsis: true });
    y += 68;

    y = section('3. ANALYSE 5M', y);
    const cinqM = analyse.cinqM || {};
    [["Main d'œuvre", cinqM.mainOeuvre], ['Méthode', cinqM.methode],
     ['Matériel', cinqM.materiel], ['Milieu', cinqM.milieu], ['Matière', cinqM.matiere]
    ].forEach(([l, v]) => { cellRow(l, v, y); y += 24; });
    y += 4;

    y = section('4. PLAN CAPA', y);
    const actions = capa.actions || [];
    if (actions.length === 0) {
      cellRow('Actions', 'Aucune action définie', y); y += 24;
    } else {
      actions.forEach((a, i) => {
        cellRow(`Action ${i+1}`, `${a.libelle || '—'} — ${a.responsable?.nom || '—'} — ${a.echeance || '—'}`, y);
        y += 24;
      });
    }
    y += 4;

    y = section('5. CLÔTURE', y);
    cellRow('Efficacité', cloture.efficacite, y); y += 24;
    cellRow('Signature RQ', cloture.signatureRQ, y); y += 28;

    // Pied de page
    doc.rect(40, y + 4, W, 20).fill(ACCENT);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(`Innofaso © ${new Date().getFullYear()} — Généré le ${new Date().toLocaleString('fr-FR')} — Réf. : ${nc.numero}`, 44, y + 10);

    doc.end();

    await log({ userId: req.user.id, action: 'EXPORT_NC_PDF',
                targetTable: 'nc', targetId: req.params.id, ipAddress: req.ip });

  } catch (err) {
    console.error('exportNcPDF error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération PDF.' });
  }
};

// ── Export Excel liste NC ─────────────────────────────────────
export const exportNcExcel = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM nc ORDER BY cree_le DESC');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Innofaso SMQ'; wb.created = new Date();
    const ws = wb.addWorksheet('Non-Conformités', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = 'INNOFASO — Liste des Non-Conformités';
    ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = `Exporté le ${new Date().toLocaleString('fr-FR')}`;
    ws.getCell('A2').font  = { italic: true, size: 9, color: { argb: 'FF666666' } };
    ws.getCell('A2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    ws.getRow(2).height = 16;

    const COLS = [
      { header: 'Numéro NC',   key: 'numero',      width: 18 },
      { header: 'Intitulé',    key: 'intitule',    width: 40 },
      { header: 'Service',     key: 'service',     width: 18 },
      { header: 'Criticité',   key: 'criticite',   width: 14 },
      { header: 'Statut',      key: 'statut',      width: 14 },
      { header: 'Émetteur',    key: 'emetteur',    width: 22 },
      { header: 'Date création', key: 'cree_le',   width: 18 },
      { header: 'Description', key: 'description', width: 50 },
    ];
    ws.columns = COLS;

    const headerRow = ws.getRow(3);
    COLS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D52' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 24;

    const CRIT_COLORS = {
      faible: { argb: 'FFD1FAE5' }, moyenne: { argb: 'FFFFF3CD' },
      elevee: { argb: 'FFFEE2E2' }, critique: { argb: 'FFEDE9FE' },
    };

    rows.forEach((nc, idx) => {
      const r = ws.addRow({
        numero:      nc.numero,
        intitule:    nc.intitule,
        service:     nc.service || '—',
        criticite:   nc.criticite,
        statut:      nc.statut,
        emetteur:    nc.emetteur || '—',
        cree_le:     new Date(nc.cree_le).toLocaleString('fr-FR'),
        description: nc.description || '—',
      });

      const rowBg  = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      const critBg = CRIT_COLORS[nc.criticite]?.argb || rowBg;
      r.eachCell((cell, colNum) => {
        cell.font      = { size: 9 };
        cell.alignment = { vertical: 'middle', wrapText: colNum === 2 || colNum === 8 };
        cell.fill      = { type: 'pattern', pattern: 'solid',
                           fgColor: { argb: colNum === 4 ? critBg : rowBg } };
        cell.border    = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      });
      r.height = 18;
    });

    const filename = `Innofaso_NC_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

    await log({ userId: req.user.id, action: 'EXPORT_NC_EXCEL', ipAddress: req.ip,
                newValue: { count: rows.length } });

  } catch (err) {
    console.error('exportNcExcel error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération Excel.' });
  }
};

// ── Rapport mensuel ───────────────────────────────────────────
export const exportRapportMensuel = async (req, res) => {
  const now   = new Date();
  const mois  = parseInt(req.query.mois)  || now.getMonth() + 1;
  const annee = parseInt(req.query.annee) || now.getFullYear();
  const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
  const fin   = `${annee}-${String(mois).padStart(2,'0')}-${new Date(annee, mois, 0).getDate()}`;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM nc WHERE cree_le BETWEEN ? AND ? ORDER BY criticite DESC, cree_le DESC',
      [debut, fin + ' 23:59:59']
    );

    const filtered = rows.filter((r) => String(r.statut || '').toLowerCase() !== 'brouillon');
    const total = filtered.length;
    const cloturees = filtered.filter((r) => String(r.statut || '').toLowerCase() === 'cloturee').length;
    const tauxCloture = total ? Math.round(cloturees / total * 100) : 0;

    const keyOf = (value) => {
      const normalized = String(value || '').trim();
      return normalized.length ? normalized : 'Non renseigné';
    };

    const addStats = (map, key, closed) => {
      if (!map[key]) map[key] = { count: 0, closed: 0 };
      map[key].count += 1;
      if (closed) map[key].closed += 1;
    };

    const serviceStats = {};
    const productStats = {};
    const matiereStats = {};
    const statusStats = {};
    const criticiteStats = {};

    filtered.forEach((r) => {
      const statut = keyOf(r.statut);
      const criticite = keyOf(r.criticite);
      const service = keyOf(r.service || r.service_emetteur);
      const produit = keyOf(r.nomProduit || r.nom_produit || r.sousType || 'Non renseigné');
      const matiereKey = String(r.sousType || '').toLowerCase().includes('matiere')
        ? keyOf(r.nomProduit || r.matiere || 'Non renseigné')
        : (String(r.matiere || '').trim().length ? keyOf(r.matiere) : null);

      const isClosed = statut === 'cloturee';
      addStats(statusStats, statut, isClosed);
      addStats(criticiteStats, criticite, isClosed);
      addStats(serviceStats, service, isClosed);
      addStats(productStats, produit, isClosed);
      if (matiereKey) addStats(matiereStats, matiereKey, isClosed);
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rapport Mensuel');
    const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR', { month:'long', year:'numeric' });

    ws.columns = [
      { header: 'Libellé', key: 'label', width: 32 },
      { header: 'NC', key: 'count', width: 12 },
      { header: 'Clôturées', key: 'closed', width: 14 },
      { header: 'Taux', key: 'rate', width: 14 },
    ];

    const makeSectionTitle = (title) => {
      const row = ws.addRow([title]);
      ws.mergeCells(`A${row.number}:D${row.number}`);
      row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D52' } };
      row.alignment = { horizontal: 'left', vertical: 'middle' };
      row.height = 22;
      ws.addRow([]);
    };

    const addMetricRow = (label, value) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      return row;
    };

    const addTable = (title, entries, includeRate = true) => {
      makeSectionTitle(title);
      const headerRow = ws.addRow(['', 'NC', 'Clôturées', 'Taux clôture']);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0B7C3' } } }; });

      entries.forEach(([label, stats]) => {
        const rate = stats.count ? `${Math.round((stats.closed / stats.count) * 100)}%` : '0%';
        const row = ws.addRow([label, stats.count, stats.closed, includeRate ? rate : '']);
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
      });
      ws.addRow([]);
    };

    ws.mergeCells('A1:D1');
    const titleRow = ws.getRow(1);
    titleRow.getCell(1).value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
    titleRow.font = { bold:true, size:14, color:{argb:'FFFFFFFF'} };
    titleRow.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
    titleRow.alignment = { horizontal:'left', vertical:'middle' };
    ws.getRow(1).height = 30;
    ws.addRow([]);

    addMetricRow('Total NC', total);
    addMetricRow('NC clôturées', cloturees);
    addMetricRow('Taux de clôture général', `${tauxCloture}%`);
    ws.addRow([]);

    const sortStats = (map) => Object.entries(map).sort((a,b) => b[1].count - a[1].count);

    addTable('Taux de clôture par service', sortStats(serviceStats));
    addTable('Taux de clôture par produit', sortStats(productStats));
    addTable('Taux de clôture par matière', sortStats(matiereStats));

    const statusEntries = Object.entries(statusStats)
      .filter(([label]) => String(label).toLowerCase() !== 'brouillon')
      .sort((a,b) => b[1].count - a[1].count);
    addTable('Taux par statut', statusEntries);

    const criticiteEntries = Object.entries(criticiteStats)
      .sort((a,b) => b[1].count - a[1].count);
    addTable('Taux par criticité', criticiteEntries);

    ws.addRow([]);
    addMetricRow('Date export', new Date().toLocaleString('fr-FR'));

    const filename = `Innofaso_Rapport_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

    await log({ userId: req.user.id, action: 'EXPORT_RAPPORT_MENSUEL', ipAddress: req.ip,
                newValue: { mois, annee, total } });

  } catch (err) {
    console.error('exportRapportMensuel error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
  }
};