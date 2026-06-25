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
// ── Export PDF fiche NC — Section "1. Identification" fidèle au formulaire ──
export const exportNcPDF = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM nc WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'NC introuvable.' });

    const nc = rows[0];

    const doc = new PDFDoc({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="NC_${nc.numero}_${Date.now()}.pdf"`);
    doc.pipe(res);

    const BLUE   = '#1F4E79';
    const ACCENT = '#3A7D52';
    const GREY   = '#F3F4F6';
    const W      = 515;

    const fmt = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';
    const textSafe = (v) => (v === undefined || v === null || v === '' ? '—' : String(v));
    const refDoc = 'PM-SM-EN-FNC-E';

    // ── En-tête ────────────────────────────────────────────────
    doc.rect(40, 40, W, 60).fill(BLUE);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text('FICHE DE NON-CONFORMITÉ', 50, 52);
    doc.fontSize(10).font('Helvetica')
       .text('INNOFASO — Système de Management de la Qualité', 50, 76);
    doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
       .text(nc.numero, W - 60, 58, { align: 'right', width: 90 });
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(`Réf. : ${refDoc}`, 50, 90);

    let y = 115;

    const row = (label, value, labelW = 160, height = 22) => {
      doc.rect(40, y, labelW, height).fill('#D6E4F0');
      doc.rect(40 + labelW, y, W - labelW, height).fill(GREY);
      doc.fillColor(BLUE).fontSize(9).font('Helvetica-Bold')
         .text(label, 44, y + (height - 11) / 2, { width: labelW - 8 });
      doc.fillColor('#222').font('Helvetica').fontSize(9)
         .text(textSafe(value), 44 + labelW, y + (height - 11) / 2, { width: W - labelW - 8 });
      y += height + 2;
    };

    const section = (title) => {
      doc.rect(40, y, W, 20).fill(ACCENT);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 44, y + 5);
      y += 24;
    };

    // ── 1. IDENTIFICATION ─────────────────────────────────────
    section('1. IDENTIFICATION');

    // N° de fiche / Date-heure (2 colonnes)
    const halfW = (W - 4) / 2;
    doc.rect(40, y, halfW, 36).fill('#D6E4F0');
    doc.rect(40 + halfW + 4, y, halfW, 36).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
       .text('N° de fiche', 44, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(textSafe(nc.numero), 44, y + 18);
    doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
       .text('Date / heure', 44 + halfW + 4, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(fmt(nc.cree_le), 44 + halfW + 4, y + 18);
    y += 42;

    // Émetteur / Service concerné (2 colonnes)
    doc.rect(40, y, halfW, 36).fill(GREY);
    doc.rect(40 + halfW + 4, y, halfW, 36).fill(GREY);
    doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
       .text('Émetteur', 44, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(textSafe(nc.emetteur), 44, y + 18);
    doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
       .text('Service concerné', 44 + halfW + 4, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(textSafe(nc.service), 44 + halfW + 4, y + 18);
    y += 42;

    // Intitulé de la non-conformité (pleine largeur)
    doc.rect(40, y, W, 36).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
       .text('Intitulé de la non-conformité', 44, y + 4);
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(textSafe(nc.intitule), 44, y + 18, { width: W - 8 });
    y += 44;

    // ── Bloc "Non-conformité Produit / Service" ────────────────
    section('Non-conformité Produit / Service');
    doc.fillColor('#555').font('Helvetica-Oblique').fontSize(8)
       .text('Objet : renseigner tous les champs', 44, y);
    y += 16;

    const checkboxLabels = [
      ['Produit Fini & Semi Fini', nc.sousType === 'produit_fini_semi_fini'],
      ['Matière Première',         nc.sousType === 'matiere_premiere'],
      ['Emballage',                 nc.sousType === 'emballage'],
    ];
    checkboxLabels.forEach(([label, checked]) => {
      doc.fillColor('#222').font('Helvetica').fontSize(9)
         .text(checked ? '☑' : '☐', 44, y)
         .text(label, 58, y);
      y += 16;
    });
    y += 4;

    const produitFields = [
      ['Nom PF / Semi-fini / MP / Emballage', nc.nomProduit],
      ['Fournisseur / Fabricant',             nc.fournisseur],
      ['N° de lot fournisseur',                nc.lotFournisseur],
      ['N° de lot interne',                    nc.lotInterne],
      ['Quantité reçue / produite',            nc.quantiteRecue],
      ['Quantité en anomalie',                 nc.quantiteAnomalie],
    ];
    produitFields.forEach(([label, value]) => { row(label, value, 200, 20); });

    // Service (préciser le système concerné)
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(nc.sousType === 'service' ? '☑' : '☐', 44, y)
       .text('Service (préciser le système concerné)', 58, y);
    y += 16;
    if (nc.sousType === 'service' && nc.serviceConcerne) {
      row('Système concerné', nc.serviceConcerne, 200, 18);
    }

    // Autre (préciser)
    doc.fillColor('#222').font('Helvetica').fontSize(9)
       .text(nc.sousType === 'autre' ? '☑' : '☐', 44, y)
       .text('Autre (Nuisibles, Maintenance, Nettoyage, chaîne de froid, Production, Environnement…)', 58, y, { width: W - 70 });
    y += 26;
    if (nc.sousType === 'autre' && nc.sousTypeAutrePrecision) {
      row('Précision', nc.sousTypeAutrePrecision, 200, 18);
    }

    // ── Pied de page ──────────────────────────────────────────
    doc.rect(40, y + 10, W, 20).fill(ACCENT);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(
         `Innofaso © ${new Date().getFullYear()} — Document confidentiel — ` +
         `Généré le ${new Date().toLocaleString('fr-FR')} — ` +
         `Référence : ${nc.numero}`,
         44, y + 16,
       );

    doc.end();

    await log({ userId: req.user?.id || null, action: 'EXPORT_NC_PDF',
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

    // Exclure les brouillons
    const filtered = rows.filter((r) => String(r.statut || '').toLowerCase() !== 'brouillon');
    const total = filtered.length;
    const cloturees = filtered.filter((r) => String(r.statut || '').toLowerCase() === 'cloturee').length;
    const tauxCloture = total ? Math.round(cloturees / total * 100) : 0;

    const keyOf = (v) => {
      const s = String(v || '').trim();
      return s.length ? s : 'Non renseigné';
    };

    const add = (map, k, closed) => {
      if (!map[k]) map[k] = { count: 0, closed: 0 };
      map[k].count += 1;
      if (closed) map[k].closed += 1;
    };

    // Stats containers
    const criticiteStats = {};
    const statusStats = {};
    const serviceStats = {};
    const productTypeStats = { 'PF&SF': { count:0, closed:0 }, 'MP': { count:0, closed:0 }, 'Emballage': { count:0, closed:0 }, 'Autre': { count:0, closed:0 } };
    const matiereStats = {};

    // Standard service list requested (ensures consistent rows even if 0)
    const servicesOrdered = ['Production', 'Qualité/SMI', 'Logistique & Approvisionnement', 'Maintenance', 'Commercial'];
    servicesOrdered.forEach(s => serviceStats[s] = { count:0, closed:0 });

    filtered.forEach((r) => {
      const statut = (r.statut || '').toLowerCase();
      const criticite = (r.criticite || '').toLowerCase();
      const service = keyOf(r.service || r.service_emetteur || 'Non renseigné');
      const sousType = String(r.sousType || '').toLowerCase();
      const isClosed = statut === 'cloturee';

      add(criticiteStats, criticite || 'non_renseignee', isClosed);
      add(statusStats, statut || 'non_renseignee', isClosed);

      // map service into serviceStats if it matches known names, otherwise accumulate under its own key
      const svcKey = servicesOrdered.includes(service) ? service : keyOf(service);
      if (!serviceStats[svcKey]) serviceStats[svcKey] = { count:0, closed:0 };
      serviceStats[svcKey].count += 1; if (isClosed) serviceStats[svcKey].closed += 1;

      // product/service grouping by sousType
      if (sousType.includes('produit') || sousType.includes('produit_fini') || sousType.includes('semi')) {
        productTypeStats['PF&SF'].count += 1; if (isClosed) productTypeStats['PF&SF'].closed += 1;
      } else if (sousType.includes('matiere')) {
        productTypeStats['MP'].count += 1; if (isClosed) productTypeStats['MP'].closed += 1;
      } else if (sousType.includes('emballage')) {
        productTypeStats['Emballage'].count += 1; if (isClosed) productTypeStats['Emballage'].closed += 1;
      } else {
        productTypeStats['Autre'].count += 1; if (isClosed) productTypeStats['Autre'].closed += 1;
      }

      // matière (si renseignée)
      const mat = keyOf(r.matiere || (sousType.includes('matiere') ? (r.nomProduit || r.nom_produit) : ''));
      if (mat && mat !== 'Non renseigné') {
        add(matiereStats, mat, isClosed);
      }
    });

    // Build workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rapport Mensuel');
    const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR', { month:'long', year:'numeric' });

    // Title
    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
    ws.getCell('A1').font = { bold:true, size:14, color:{argb:'FFFFFFFF'} };
    ws.getCell('A1').fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F4E79'} };
    ws.getRow(1).height = 28;
    ws.addRow([]);

    // MAIN summary table
    ws.addRow(['Résumé général']);
    ws.addRow(['Total NC', total]);
    ws.addRow(['NC clôturées', cloturees]);
    ws.addRow(['Taux de clôture', `${tauxCloture}%`]);
    ws.addRow([]);

    const makeSmallTable = (title, rowsArr) => {
      ws.addRow([title]);
      ws.addRow(['Libellé', 'NC', 'Clôturées', 'Taux clôture']);
      rowsArr.forEach(([label, stats]) => {
        const count = stats.count || 0;
        const closed = stats.closed || 0;
        const rate = count ? `${Math.round(closed / count * 100)}%` : '0%';
        ws.addRow([label, count, closed, rate]);
      });
      ws.addRow([]);
    };

    // Criticité — ensure ordered: faible, moyenne, elevee, critique
    const critOrder = ['faible','moyenne','elevee','critique'];
    const critRows = critOrder.map(k => [k, criticiteStats[k] || {count:0,closed:0}]);
    makeSmallTable('Taux de clôture par criticité', critRows);

    // Statut — only ouverte & cloturee
    const statutRows = [ ['ouverte', statusStats['ouverte'] || {count:0,closed:0}], ['cloturee', statusStats['cloturee'] || {count:0,closed:0}] ];
    makeSmallTable('Taux par statut', statutRows);

    // Service — present requested order + any extras
    const extraServices = Object.keys(serviceStats).filter(s => !servicesOrdered.includes(s));
    const svcRows = servicesOrdered.map(s => [s, serviceStats[s] || {count:0,closed:0}]).concat(extraServices.map(s => [s, serviceStats[s]]));
    makeSmallTable('Taux de clôture par service', svcRows);

    // Produit / Service grouping
    const prodRows = Object.entries(productTypeStats).map(([k,v]) => [k, v]);
    makeSmallTable('Taux de clôture par type produit/service', prodRows);

    // Matière — list most frequent matières
    const matEntries = Object.entries(matiereStats).sort((a,b) => b[1].count - a[1].count);
    makeSmallTable('Taux de clôture par matière', matEntries.length ? matEntries : [['Non renseigné',{count:0,closed:0}]]);

    ws.addRow([]);
    ws.addRow(['Date export', new Date().toLocaleString('fr-FR')]);

    const filename = `Innofaso_Rapport_${annee}_${String(mois).padStart(2,'0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();

    await log({ userId: req.user.id, action: 'EXPORT_RAPPORT_MENSUEL', ipAddress: req.ip, newValue: { mois, annee, total } });

  } catch (err) {
    console.error('exportRapportMensuel error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Erreur génération rapport.' });
  }
};