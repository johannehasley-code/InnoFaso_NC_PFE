import pool from '../db.js';
import { log } from '../models/auditLog.js';
import PDFDoc from 'pdfkit';
import ExcelJS from 'exceljs';
import { SERVICES } from '../services/organisation.js';

// ── Fusionne la colonne JSON générique `donnees` sur la ligne SQL brute ──
// Les champs ajoutés au formulaire au fil du temps (nomProduit, fournisseur,
// lotInterne, quantiteRecue, sousType, realiseePar, descriptionRealiseePar,
// typeNonConformite, etc.) sont stockés dans la colonne JSON `donnees` et
// n'apparaissent pas comme colonnes SQL dédiées : sans cette fusion, l'export
// PDF/Excel les verrait toujours comme `undefined`.
function fusionnerDonnees(nc) {
  if (!nc) return nc;
  let extra = nc.donnees;
  if (typeof extra === 'string') {
    try { extra = JSON.parse(extra); } catch { extra = {}; }
  }
  return { ...(extra || {}), ...nc };
}

const LIBELLE_SERVICE = (codeOuLibelle) => {
  const s = String(codeOuLibelle || '').trim();
  if (!s) return 'Non renseigné';
  return SERVICES[s]?.libelle || s;
};

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

    // ✅ FIX : LIMIT/OFFSET injectés directement (sécurisés en entiers),
    // car mysql2 plante avec LIMIT ?/OFFSET ? en prepared statement (erreur 500).
    if (req.query.limit !== undefined) {
      const safeLimit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
      q += ` LIMIT ${safeLimit}`;
    }
    if (req.query.offset !== undefined) {
      const safeOffset = Math.max(parseInt(req.query.offset) || 0, 0);
      q += ` OFFSET ${safeOffset}`;
    }

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

// ── Export PDF fiche NC — Section "1. Identification" fidèle au formulaire ──
export const exportNcPDF = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM nc WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'NC introuvable.' });

    const nc = fusionnerDonnees(rows[0]);

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
    const refDoc = nc.refDocument || 'PM-SM-EN-FNC-E';

    // ── En-tête ────────────────────────────────────────────────
    doc.rect(40, 40, W, 60).fill(BLUE);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
       .text('FICHE DE NON-CONFORMITÉ', 50, 52);
    doc.fontSize(10).font('Helvetica')
       .text('INNOFASO — Système de Management de la Qualité', 50, 76);
    // Référence/numéro de fiche : taille adaptée + lineBreak désactivé pour
    // garantir qu'elle reste toujours sur une seule ligne, même si elle est
    // plus longue que prévu (ex. numérotation à rallonge).
    doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Bold')
       .text(textSafe(nc.numero), 40, 58, { align: 'right', width: W - 10, lineBreak: false });
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(`Réf. : ${refDoc}`, 50, 90, { lineBreak: false });

    let y = 106;

    const row = (label, value, labelW = 160, height = 18) => {
      doc.rect(40, y, labelW, height).fill('#D6E4F0');
      doc.rect(40 + labelW, y, W - labelW, height).fill(GREY);
      doc.fillColor(BLUE).fontSize(8).font('Helvetica-Bold')
         .text(label, 44, y + (height - 9) / 2, { width: labelW - 8 });
      doc.fillColor('#222').font('Helvetica').fontSize(8.5)
         .text(textSafe(value), 44 + labelW, y + (height - 9) / 2, { width: W - labelW - 8 });
      y += height + 2;
    };

    const section = (title) => {
      doc.rect(40, y, W, 16).fill(ACCENT);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(title, 44, y + 3.5);
      y += 19;
    };

    // ── 1. IDENTIFICATION ─────────────────────────────────────
    section('1. IDENTIFICATION');

    // N° de fiche / Date-heure (2 colonnes)
    const halfW = (W - 4) / 2;
    doc.rect(40, y, halfW, 28).fill('#D6E4F0');
    doc.rect(40 + halfW + 4, y, halfW, 28).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('N° de fiche', 44, y + 3);
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(textSafe(nc.numero), 44, y + 15);
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('Date / heure', 44 + halfW + 4, y + 3);
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(fmt(nc.cree_le), 44 + halfW + 4, y + 15);
    y += 31;

    // Émetteur / Service concerné (2 colonnes)
    doc.rect(40, y, halfW, 28).fill(GREY);
    doc.rect(40 + halfW + 4, y, halfW, 28).fill(GREY);
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('Émetteur', 44, y + 3);
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(textSafe(nc.emetteur), 44, y + 15);
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('Service concerné', 44 + halfW + 4, y + 3);
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(textSafe(nc.service), 44 + halfW + 4, y + 15);
    y += 31;

    // Intitulé de la non-conformité (pleine largeur)
    doc.rect(40, y, W, 28).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('Intitulé de la non-conformité', 44, y + 3);
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(textSafe(nc.intitule), 44, y + 15, { width: W - 8 });
    y += 32;

    // ── Bloc "Non-conformité Produit / Service" ────────────────
    section('Non-conformité Produit / Service');

    const checkboxLabels = [
      ['Produit Fini & Semi Fini', nc.sousType === 'produit_fini_semi_fini'],
      ['Matière Première',         nc.sousType === 'matiere_premiere'],
      ['Emballage',                 nc.sousType === 'emballage'],
    ];
    checkboxLabels.forEach(([label, checked]) => {
      doc.fillColor('#222').font('Helvetica').fontSize(8.5)
         .text(checked ? '☑' : '☐', 44, y)
         .text(label, 58, y);
      y += 13;
    });
    y += 2;

    const produitFields = [
      ['Nom PF / Semi-fini / MP / Emballage', nc.nomProduit],
      ['Fournisseur / Fabricant',             nc.fournisseur],
      ['N° de lot fournisseur',                nc.lotFournisseur],
      ['N° de lot interne',                    nc.lotInterne],
      ['Quantité reçue / produite',            nc.quantiteRecue],
      ['Quantité en anomalie',                 nc.quantiteAnomalie],
    ];
    produitFields.forEach(([label, value]) => { row(label, value, 200, 16); });

    // Service (préciser le système concerné)
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(nc.sousType === 'service' ? '☑' : '☐', 44, y)
       .text('Service (préciser le système concerné)', 58, y);
    y += 13;
    if (nc.sousType === 'service' && nc.serviceConcerne) {
      row('Système concerné', nc.serviceConcerne, 200, 14);
    }

    // Autre (préciser)
    doc.fillColor('#222').font('Helvetica').fontSize(8.5)
       .text(nc.sousType === 'autre' ? '☑' : '☐', 44, y)
       .text('Autre (Nuisibles, Maintenance, Nettoyage, chaîne de froid, Production, Environnement…)', 58, y, { width: W - 70 });
    y += 20;
    if (nc.sousType === 'autre' && nc.sousTypeAutrePrecision) {
      row('Précision', nc.sousTypeAutrePrecision, 200, 14);
    }

    // ── 2. DESCRIPTION ──────────────────────────────────────────
    // Suite logique de la fiche : la description doit apparaître après
    // l'identification, sur la même page (tout doit tenir sur une seule page).
    y += 2;
    section('2. DESCRIPTION DE LA NON-CONFORMITÉ');

    const descFields = [
      ['Description détaillée', nc.description, 30],
      ['Vérifié par', nc.verifiePar, 16],
      ['Type de non-conformité', nc.typeNonConformite, 16],
      ['Criticité', nc.criticite, 16],
      ['Exigence non respectée', nc.exigence, 18],
      ['Conséquences', nc.consequences, 18],
      ['Risques associés', nc.risques, 18],
    ];
    descFields.forEach(([label, value, height]) => {
      doc.rect(40, y, 150, height).fill('#D6E4F0');
      doc.rect(190, y, W - 150, height).fill(GREY);
      doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
         .text(label, 44, y + 3, { width: 142 });
      doc.fillColor('#222').font('Helvetica').fontSize(8.5)
         .text(textSafe(value), 194, y + 3, { width: W - 162 });
      y += height + 2;
    });

    y += 3;
    // ── Réalisé par (rempli par l'émetteur), en fin de section Description ──
    doc.rect(40, y, W, 24).fill('#D6E4F0');
    doc.fillColor(BLUE).fontSize(7.5).font('Helvetica-Bold')
       .text('Réalisé par', 44, y + 4);
    doc.fillColor('#222').font('Helvetica-Bold').fontSize(9)
       .text(textSafe(nc.descriptionRealiseePar || nc.realiseePar || nc.emetteur), 44, y + 13);
    y += 32;

    doc.rect(40, y, W, 18).fill(ACCENT);
    doc.fillColor('white').fontSize(7).font('Helvetica')
       .text(
         `Innofaso © ${new Date().getFullYear()} — Document confidentiel — ` +
         `Généré le ${new Date().toLocaleString('fr-FR')} — Référence : ${nc.numero}`,
         44, y + 5.5, { width: W - 8, lineBreak: false },
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
    const [rowsRaw] = await pool.execute('SELECT * FROM nc ORDER BY cree_le DESC');
    const rows = rowsRaw.map(fusionnerDonnees);

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

// ── Rapport mensuel — version colorée ──────────────────────────
export const exportRapportMensuel = async (req, res) => {
  const now   = new Date();
  const mois  = parseInt(req.query.mois)  || now.getMonth() + 1;
  const annee = parseInt(req.query.annee) || now.getFullYear();
  const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
  const fin   = `${annee}-${String(mois).padStart(2,'0')}-${new Date(annee, mois, 0).getDate()}`;

  try {
    const [rowsRaw] = await pool.execute(
      'SELECT * FROM nc WHERE cree_le BETWEEN ? AND ? ORDER BY criticite DESC, cree_le DESC',
      [debut, fin + ' 23:59:59']
    );
    const rows = rowsRaw.map(fusionnerDonnees);

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

    const servicesOrdered = Object.values(SERVICES).map((s) => s.libelle);
    servicesOrdered.forEach(s => serviceStats[s] = { count:0, closed:0 });

    filtered.forEach((r) => {
      const statut = (r.statut || '').toLowerCase();
      const criticite = (r.criticite || '').toLowerCase();
      // Le formulaire enregistre le CODE du service (ex. 'qualite',
      // 'admin_finance'), pas son libellé. On normalise systématiquement
      // vers le libellé pour éviter d'avoir deux lignes différentes
      // (une par code, une par libellé) pour le même service réel.
      const service = LIBELLE_SERVICE(r.service);
      const sousType = String(r.sousType || '').toLowerCase();
      const isClosed = statut === 'cloturee';

      add(criticiteStats, criticite || 'non_renseignee', isClosed);
      add(statusStats, statut || 'non_renseignee', isClosed);

      if (!serviceStats[service]) serviceStats[service] = { count:0, closed:0 };
      serviceStats[service].count += 1; if (isClosed) serviceStats[service].closed += 1;

      if (sousType.includes('produit') || sousType.includes('produit_fini') || sousType.includes('semi')) {
        productTypeStats['PF&SF'].count += 1; if (isClosed) productTypeStats['PF&SF'].closed += 1;
      } else if (sousType.includes('matiere')) {
        productTypeStats['MP'].count += 1; if (isClosed) productTypeStats['MP'].closed += 1;
      } else if (sousType.includes('emballage')) {
        productTypeStats['Emballage'].count += 1; if (isClosed) productTypeStats['Emballage'].closed += 1;
      } else {
        productTypeStats['Autre'].count += 1; if (isClosed) productTypeStats['Autre'].closed += 1;
      }

      const mat = keyOf(r.matiere || (sousType.includes('matiere') ? (r.nomProduit || r.nom_produit) : ''));
      if (mat && mat !== 'Non renseigné') {
        add(matiereStats, mat, isClosed);
      }
    });

    // ── Construction du classeur avec couleurs ──────────────────
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rapport Mensuel');
    const nomMois = new Date(annee, mois-1).toLocaleString('fr-FR', { month:'long', year:'numeric' });

    const BLUE        = 'FF1F4E79';
    const ACCENT       = 'FF3A7D52';
    const LIGHT_BLUE   = 'FFD6E4F0';
    const LIGHT_GREEN  = 'FFE2F0E5';
    const HEADER_GREY  = 'FF6B8E9E';
    const WHITE        = 'FFFFFFFF';

    // Titre principal
    ws.mergeCells('A1:D1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `RAPPORT MENSUEL QUALITÉ — ${nomMois.toUpperCase()}`;
    titleCell.font = { bold:true, size:14, color:{argb:WHITE} };
    titleCell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:BLUE} };
    titleCell.alignment = { horizontal:'center', vertical:'middle' };
    ws.getRow(1).height = 28;
    ws.addRow([]);

    // Résumé général
    const resumeHeaderRow = ws.addRow(['Résumé général']);
    resumeHeaderRow.getCell(1).font = { bold:true, color:{argb:WHITE} };
    resumeHeaderRow.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:BLUE} };

    const summaryRows = [
      ['Total NC', total],
      ['NC clôturées', cloturees],
      ['Taux de clôture', `${tauxCloture}%`],
    ];
    summaryRows.forEach(([label, value], idx) => {
      const r = ws.addRow([label, value]);
      const bg = idx % 2 === 0 ? LIGHT_BLUE : WHITE;
      r.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} };
      r.getCell(2).fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} };
      r.getCell(1).font = { bold:true };
    });
    ws.addRow([]);

    const CRIT_COLORS = {
      faible: 'FFD1FAE5', moyenne: 'FFFFF3CD', elevee: 'FFFEE2E2', critique: 'FFEDE9FE',
    };

    const makeSmallTable = (title, rowsArr, colorMap = null) => {
      const titleRow = ws.addRow([title]);
      titleRow.getCell(1).font = { bold:true, color:{argb:WHITE} };
      titleRow.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:ACCENT} };

      const headerRow = ws.addRow(['Libellé', 'NC', 'Clôturées', 'Taux clôture']);
      headerRow.eachCell((cell) => {
        cell.font = { bold:true, color:{argb:WHITE} };
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:HEADER_GREY} };
      });

      rowsArr.forEach(([label, stats], idx) => {
        const count = stats.count || 0;
        const closed = stats.closed || 0;
        const rate = count ? `${Math.round(closed / count * 100)}%` : '0%';
        const r = ws.addRow([label, count, closed, rate]);
        const bg = colorMap?.[String(label).toLowerCase()] || (idx % 2 === 0 ? LIGHT_GREEN : WHITE);
        r.eachCell((cell) => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:bg} };
          cell.border = { bottom: { style:'thin', color:{argb:'FFE0E0E0'} } };
        });
      });
      ws.addRow([]);
    };

    // Criticité — ensure ordered: faible, moyenne, elevee, critique
    const critOrder = ['faible','moyenne','elevee','critique'];
    const critRows = critOrder.map(k => [k, criticiteStats[k] || {count:0,closed:0}]);
    makeSmallTable('Taux de clôture par criticité', critRows, CRIT_COLORS);

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
    const dateRow = ws.addRow(['Date export', new Date().toLocaleString('fr-FR')]);
    dateRow.getCell(1).font = { italic:true, color:{argb:'FF888888'} };
    dateRow.getCell(2).font = { italic:true, color:{argb:'FF888888'} };

    // Largeurs de colonnes pour un rendu plus propre
    ws.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }];

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