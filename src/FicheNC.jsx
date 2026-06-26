import { useState, useEffect, useCallback } from 'react';
import { C } from './lib/theme.js';
import { api } from './lib/api.js';
import { Champ, Input, Textarea, Select, Btn, Carte, BadgeStatut } from './components/ui.jsx';
import FriseStatut from './components/FriseStatut.jsx';
import {
  IRetour, IFleche, IEnregistrer, IEnvoi, ILecture, ICheck, ICadenas,
  IPlus, IAlerte, IDoc5M, ICalendrier, IUser, IHorloge, IEclair,
} from './components/Icones.jsx';
import BoutonIA from './components/BoutonIA.jsx';
import { useAuth } from './context/AuthContext.jsx';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const REF_PAR_DEFAUT = 'PM-SM-EN-FNC-E';

const ETAPES = [
  { titre: 'Identification', aide: 'Identifiez la source et le contexte de la non-conformité.' },
  { titre: 'Description', aide: "Caractérisez le type d'objet, la criticité et les impacts." },
  { titre: 'Action immédiate', aide: 'Documentez toute mesure corrective réalisée immédiatement.' },
  { titre: 'Analyse 5M / 5P', aide: 'Recherchez les causes racines avec la méthode Ishikawa.' },
  { titre: 'Plans CAPA', aide: 'Définissez les actions correctives et préventives à mener.' },
  { titre: 'Clôture', aide: "Vérifiez l'efficacité et clôturez formellement la fiche." },
];

const TYPES_OBJET = ['Produit', 'Processus', 'Document', 'Équipement', 'Service / Prestation', 'Emballage', 'MP'];
const TYPES_NC = ['Produit', 'Service'];
const CRITICITES = [
  { v: 'faible', l: 'Faible', c: C.greenFonce, bg: C.greenBg },
  { v: 'moyenne', l: 'Moyenne', c: C.bleu, bg: C.bleuBg },
  { v: 'elevee', l: 'Élevée', c: C.orange, bg: C.orangeBg },
  { v: 'critique', l: 'Critique', c: C.rouge, bg: C.rougeBg },
];

function ligneVide() {
  return { pourquoi: '', parceque: '' };
}

function etatVide() {
  return {
    refDocument: REF_PAR_DEFAUT,
    emetteur: '', service: '', intitule: '', description: '',
    verifiePar: '',
    criticite: 'moyenne', classification: '', typeObjet: [], typeNonConformite: '',

    descriptionEtape: '',
    preuveTangible: '',
    preuveTangibleFichier: '',
    descriptionRealiseePar: '',

    sousType: '',
    nomProduit: '',
    fournisseur: '',
    lotFournisseur: '',
    lotInterne: '',
    quantiteRecue: '',
    quantiteAnomalie: '',
    serviceConcerne: '',
    sousTypeAutrePrecision: '',

    exigence: '', consequences: '', risques: '',
    actionImmediate: 'non', actionRealisee: '', realiseePar: '',

    analyse: {
      cinqM: { mainOeuvre: '', methode: '', materiel: '', milieu: '', matiere: '' },
      pourquoiParM: {
        mainOeuvre: [ligneVide()],
        methode: [ligneVide()],
        materiel: [ligneVide()],
        milieu: [ligneVide()],
        matiere: [ligneVide()],
      },
    },
    capa: { actions: [] },
    cloture: { preuves: '', efficacite: '', majRisques: '', signatureRQ: '', parResponsable: {}, verifieParActions: '' },
  };
}

function AideEtape({ etape, refDocument, onChangeRef, dis }) {
  const e = ETAPES[etape];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: C.greenBg, border: `1px solid ${C.greenBord}`,
      borderRadius: 9, padding: '11px 15px', marginBottom: 20,
    }}>
      <span style={{ color: C.green, display: 'flex', flexShrink: 0, marginTop: 1 }}>
        <IDoc5M t={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {onChangeRef ? (
          <input
            value={refDocument}
            disabled={dis}
            onChange={(ev) => onChangeRef(ev.target.value)}
            placeholder="Référence du document"
            style={{
              fontSize: 12, fontWeight: 700, color: C.greenFonce, display: 'block', marginBottom: 4,
              background: 'transparent', border: 'none', borderBottom: `1px dashed ${C.greenFonce}`,
              outline: 'none', padding: '0 0 2px', width: '100%', fontFamily: 'inherit',
            }}
          />
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.greenFonce, display: 'block', marginBottom: 2 }}>
            {refDocument}
          </span>
        )}
        <span style={{ fontSize: 13, color: C.greenEncreuse, lineHeight: 1.5 }}>{e.aide}</span>
      </div>
    </div>
  );
}

function ResumeRapide({ nc, form }) {
  if (!nc) return null;
  const champs = [
    { ok: !!form.emetteur, l: 'Émetteur' },
    { ok: !!form.service, l: 'Service' },
    { ok: !!form.intitule, l: 'Intitulé' },
    { ok: form.typeObjet.length > 0, l: 'Type objet' },
    { ok: !!form.analyse?.cinqM?.mainOeuvre || !!form.analyse?.cinqM?.methode, l: 'Causes (5M)' },
    { ok: form.capa?.actions?.length > 0, l: 'CAPA' },
    { ok: !!form.cloture?.efficacite, l: 'Efficacité' },
  ];
  const nb = champs.filter((c) => c.ok).length;
  const pct = Math.round((nb / champs.length) * 100);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.texteDoux, marginBottom: 7 }}>
          Complétion de la fiche — {pct}%
        </div>
        <div style={{ height: 7, background: C.bgVoile, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? `linear-gradient(90deg,${C.green},${C.greenFonce})` : `linear-gradient(90deg,${C.bleu},${C.green})`, borderRadius: 4, transition: 'width .4s' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {champs.map((c) => (
          <span key={c.l} title={c.l} style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            background: c.ok ? C.greenBg : C.bgVoile, color: c.ok ? C.greenFonce : C.texteFaible,
          }}>{c.ok ? '✓' : '·'} {c.l}</span>
        ))}
      </div>
    </div>
  );
}

function ZoneUpload({ label, valeur, disabled, onChange }) {
  return (
    <Champ label={label}>
      <div style={{
        border: `1.5px dashed ${C.borderFort}`, borderRadius: 8, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10, background: disabled ? C.surfaceAlt : '#fff',
      }}>
        <span style={{ color: C.texteFaible, display: 'flex', flexShrink: 0 }}><IDoc5M t={16} /></span>
        <label style={{ flex: 1, cursor: disabled ? 'default' : 'pointer' }}>
          <input
            type="file"
            disabled={disabled}
            style={{ display: 'none' }}
            onChange={(e) => onChange(e.target.files?.[0]?.name || '')}
          />
          <span style={{ fontSize: 13, color: valeur ? C.texte : C.texteFaible }}>
            {valeur || 'Choisir un fichier à joindre…'}
          </span>
        </label>
        {valeur && !disabled && (
          <button onClick={() => onChange('')} style={{
            background: C.rougeBg, border: `1px solid #f0cfcc`, color: C.rouge,
            cursor: 'pointer', borderRadius: 6, padding: '3px 9px', fontSize: 11.5, fontWeight: 600,
          }}>Retirer</button>
        )}
      </div>
    </Champ>
  );
}

// --- Section transfert par email (principal + copies) -----------------------
function SectionTransfert({ titre, dis, ncId, ncNumero, onTransfere }) {
  const [ouvert, setOuvert] = useState(false);
  const [destinataire, setDestinataire] = useState('');
  const [copies, setCopies] = useState(['']);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);

  const ajouterCopie = () => setCopies((c) => [...c, '']);
  const retirerCopie = (i) => setCopies((c) => c.filter((_, j) => j !== i));
  const majCopie = (i, val) => setCopies((c) => c.map((v, j) => (j === i ? val : v)));

  const envoyer = async () => {
    if (!destinataire) { setResultat({ ok: false, texte: 'Destinataire principal requis.' }); return; }
    if (!ncId) { setResultat({ ok: false, texte: 'Enregistrez la fiche avant de la transférer.' }); return; }
    setEnCours(true);
    setResultat(null);
    try {
      const r = await api.transfererFiche(ncId, {
        destinataire,
        copies: copies.filter(Boolean),
        message,
      });
      setResultat({ ok: true, texte: `Fiche transférée par email à ${r.envoyes} destinataire(s).` });
      onTransfere?.(r);
    } catch (e) {
      setResultat({ ok: false, texte: e.message || "Erreur lors de l'envoi." });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 18, marginBottom: 4, overflow: 'hidden' }}>
      <button
        onClick={() => setOuvert((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: C.surfaceAlt, border: 'none', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 700, color: C.texte,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: C.green, display: 'flex' }}><IEnvoi t={16} /></span>
          {titre}
        </span>
        <span style={{ color: C.texteFaible, fontSize: 12 }}>{ouvert ? '▲' : '▼'}</span>
      </button>

      {ouvert && (
        <div style={{ padding: '16px', background: '#fff' }}>
          <Champ label="Destinataire principal" obligatoire>
            <Input
              type="email"
              value={destinataire}
              disabled={dis}
              onChange={(e) => setDestinataire(e.target.value)}
              placeholder="nom@innofaso.bf"
            />
          </Champ>

          <div style={{ marginBottom: 6 }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.texteDoux, marginBottom: 6 }}>
              Copie (CC)
            </span>
            {copies.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <Input
                  type="email"
                  value={c}
                  disabled={dis}
                  onChange={(e) => majCopie(i, e.target.value)}
                  placeholder="copie@innofaso.bf"
                  style={{ flex: 1 }}
                />
                {!dis && copies.length > 1 && (
                  <button
                    onClick={() => retirerCopie(i)}
                    style={{ background: C.rougeBg, border: '1px solid #f0cfcc', color: C.rouge, cursor: 'pointer', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600 }}
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
            {!dis && (
              <Btn variant="ghost" onClick={ajouterCopie}>
                <IPlus t={14} /> Ajouter une copie
              </Btn>
            )}
          </div>

          <Champ label="Message (optionnel)">
            <Textarea rows={2} value={message} disabled={dis} onChange={(e) => setMessage(e.target.value)} placeholder="Message accompagnant le transfert…" />
          </Champ>

          {resultat && (
            <div style={{
              padding: '9px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500,
              background: resultat.ok ? C.greenBg : C.rougeBg, color: resultat.ok ? C.greenFonce : C.rouge,
            }}>
              {resultat.texte}
            </div>
          )}

          <Btn variant="primary" disabled={enCours || dis} onClick={envoyer}>
            <IEnvoi t={15} /> {enCours ? 'Envoi…' : `Transférer ${ncNumero ? `(${ncNumero})` : 'la fiche'}`}
          </Btn>
        </div>
      )}
    </div>
  );
}

export default function FicheNC({ ncId = null, services = [], onChangement }) {
  const { is } = useAuth();
  const [etape, setEtape] = useState(0);
  const [form, setForm] = useState(etatVide());
  const [nc, setNc] = useState(null);
  const [msg, setMsg] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const verrouillee = nc?.statut === 'cloturee';
  const dispo = (a) => (nc?.transitionsDisponibles || []).some((t) => t.action === a);

  useEffect(() => {
    if (!ncId) return;
    api.obtenirNc(ncId).then((data) => {
      setNc(data);
      setForm(() => ({
        ...etatVide(),
        ...data,
        refDocument: data.refDocument || REF_PAR_DEFAUT,
        cloture: {
          ...etatVide().cloture,
          ...(data.cloture || {}),
          parResponsable: { ...(data.cloture?.parResponsable || {}) },
        },
        analyse: {
          cinqM: { ...etatVide().analyse.cinqM, ...(data.analyse?.cinqM || {}) },
          pourquoiParM: {
            ...etatVide().analyse.pourquoiParM,
            ...(data.analyse?.pourquoiParM || {}),
          },
        },
      }));
    });
  }, [ncId]);

  const set = (champ, val) => setForm((f) => ({ ...f, [champ]: val }));
  const setM = (cle, val) =>
    setForm((f) => ({ ...f, analyse: { ...f.analyse, cinqM: { ...f.analyse.cinqM, [cle]: val } } }));
  const setCloture = (cle, val) =>
    setForm((f) => ({ ...f, cloture: { ...f.cloture, [cle]: val } }));
  const setParResponsable = (idx, champKey, val) =>
    setForm((f) => ({
      ...f,
      cloture: {
        ...f.cloture,
        parResponsable: {
          ...f.cloture.parResponsable,
          [idx]: { ...(f.cloture.parResponsable[idx] || {}), [champKey]: val },
        },
      },
    }));

  const setLignePourquoi = (m, i, champKey, val) => {
    setForm((f) => {
      const lignes = [...(f.analyse.pourquoiParM?.[m] || [ligneVide()])];
      lignes[i] = { ...lignes[i], [champKey]: val };
      return { ...f, analyse: { ...f.analyse, pourquoiParM: { ...(f.analyse.pourquoiParM || {}), [m]: lignes } } };
    });
  };
  const ajouterLignePourquoi = (m) => {
    setForm((f) => {
      const lignes = [...(f.analyse.pourquoiParM?.[m] || [ligneVide()]), ligneVide()];
      return { ...f, analyse: { ...f.analyse, pourquoiParM: { ...(f.analyse.pourquoiParM || {}), [m]: lignes } } };
    });
  };
  const retirerLignePourquoi = (m, i) => {
    setForm((f) => {
      const lignes = (f.analyse.pourquoiParM?.[m] || [ligneVide()]).filter((_, j) => j !== i);
      return { ...f, analyse: { ...f.analyse, pourquoiParM: { ...(f.analyse.pourquoiParM || {}), [m]: lignes.length ? lignes : [ligneVide()] } } };
    });
  };

  const flash = (type, texte) => { setMsg({ type, texte }); setTimeout(() => setMsg(null), 4500); };

  const enregistrer = useCallback(async () => {
    setEnCours(true);
    try {
      const saved = nc?.id ? await api.majNc(nc.id, form) : await api.creerNc(form);
      setNc(saved);
      flash('ok', `Brouillon enregistré — ${saved.numero}`);
      onChangement?.();
      return saved;
    } catch (e) {
      flash('err', e.message);
    } finally {
      setEnCours(false);
    }
  }, [nc, form, onChangement]);

  const soumettre = async () => {
    setEnCours(true);
    try {
      const saved = nc?.id ? await api.majNc(nc.id, form) : await api.creerNc(form);
      const r = await api.soumettre(saved.id);
      setNc(r.nc);
      let texte = `NC ${r.nc.numero} soumise. Pilote « ${r.nc.assigneA?.nom || '—'} » notifié.`;
      if (r.alerte?.declenchee) texte += ` Alerte critique RQ+DG envoyée en ${r.alerte.delaiMs} ms.`;
      flash('ok', texte);
      onChangement?.();
    } catch (e) {
      flash('err', e.message);
    } finally {
      setEnCours(false);
    }
  };

  const faireTransition = async (action) => {
    setEnCours(true);
    try {
      if (nc?.id && !verrouillee) await api.majNc(nc.id, form);
      const maj = await api.transition(nc.id, action);
      setNc(maj.nc || maj);
      flash('ok', `Statut mis à jour avec succès.`);
      onChangement?.();
    } catch (e) {
      flash('err', e.message);
    } finally {
      setEnCours(false);
    }
  };

  const dis = verrouillee;
  const actionsCapa = form.capa.actions || [];

  const bandeauGroqManquant = !GROQ_API_KEY && (
    <div style={{
      padding: '9px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12.5,
      background: '#fbf0e2', color: '#a85b00',
      border: '1px solid #e8c88a', display: 'flex', alignItems: 'center', gap: 9,
    }}>
      ⚠ Clé Groq non configurée — créez un fichier <code>.env</code> à la racine et ajoutez :{' '}
      <code>VITE_GROQ_API_KEY=gsk_…</code>
    </div>
  );

  const etapes = [
    // Étape 1 — Identification
    <div key="e1">
      <AideEtape etape={0} refDocument={form.refDocument} dis={dis}
        onChangeRef={(val) => set('refDocument', val)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Champ label="N° de fiche">
          <Input value={nc?.numero || "— attribué à l'enregistrement —"} disabled />
        </Champ>
        <Champ label="Date / heure">
          <Input value={nc ? new Date(nc.creeLe).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')} disabled />
        </Champ>
        <Champ label="Émetteur" obligatoire>
          <Input value={form.emetteur} disabled={dis} onChange={(e) => set('emetteur', e.target.value)} placeholder="Prénom NOM" />
        </Champ>
        <Champ label="Service concerné" obligatoire>
          <Select value={form.service} disabled={dis} onChange={(e) => set('service', e.target.value)}>
            <option value="">— Choisir —</option>
            {services.map((s) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
          </Select>
        </Champ>
      </div>
      <Champ label="Intitulé de la non-conformité" obligatoire aide="Une phrase courte décrivant clairement la NC (ex. : « Lot B-042 hors tolérance »).">
        <Input value={form.intitule} disabled={dis} onChange={(e) => set('intitule', e.target.value)} placeholder="Résumé en une ligne" />
      </Champ>

      <div style={{ border: `1.5px solid ${C.borderFort}`, borderRadius: 10, padding: '16px 18px', marginTop: 22, background: '#fbfcfb' }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: C.texte, textDecoration: 'underline' }}>
          Non-conformité Produit / Service
        </h4>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: C.texteDoux }}>
          Objet : renseigner tous les champs
        </p>

        {[
          ['produit_fini_semi_fini', 'Produit Fini & Semi Fini'],
          ['matiere_premiere', 'Matière Première'],
          ['emballage', 'Emballage'],
        ].map(([v, l]) => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 14, cursor: dis ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={dis}
              checked={form.sousType === v}
              onChange={() => set('sousType', form.sousType === v ? '' : v)}
              style={{ width: 17, height: 17, accentColor: C.green }}
            />
            {l}
          </label>
        ))}

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Champ label="Nom PF / Semi-fini / MP / Emballage">
            <Input value={form.nomProduit} disabled={dis} onChange={(e) => set('nomProduit', e.target.value)} />
          </Champ>
          <Champ label="Fournisseur / Fabricant">
            <Input value={form.fournisseur} disabled={dis} onChange={(e) => set('fournisseur', e.target.value)} />
          </Champ>
          <Champ label="N° de lot fournisseur">
            <Input value={form.lotFournisseur} disabled={dis} onChange={(e) => set('lotFournisseur', e.target.value)} />
          </Champ>
          <Champ label="N° de lot interne">
            <Input value={form.lotInterne} disabled={dis} onChange={(e) => set('lotInterne', e.target.value)} />
          </Champ>
          <Champ label="Quantité reçue / produite">
            <Input value={form.quantiteRecue} disabled={dis} onChange={(e) => set('quantiteRecue', e.target.value)} />
          </Champ>
          <Champ label="Quantité en anomalie">
            <Input value={form.quantiteAnomalie} disabled={dis} onChange={(e) => set('quantiteAnomalie', e.target.value)} />
          </Champ>
        </div>

        <div style={{ marginTop: 16, borderTop: `1px dashed ${C.border}`, paddingTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 14, cursor: dis ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={dis}
              checked={form.sousType === 'service'}
              onChange={() => set('sousType', form.sousType === 'service' ? '' : 'service')}
              style={{ width: 17, height: 17, accentColor: C.green }}
            />
            Service (Préciser le système concerné)
          </label>
          {form.sousType === 'service' && (
            <Input
              value={form.serviceConcerne}
              disabled={dis}
              onChange={(e) => set('serviceConcerne', e.target.value)}
              placeholder="Système concerné…"
              style={{ marginBottom: 10 }}
            />
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, cursor: dis ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={dis}
              checked={form.sousType === 'autre'}
              onChange={() => set('sousType', form.sousType === 'autre' ? '' : 'autre')}
              style={{ width: 17, height: 17, accentColor: C.green, marginTop: 2 }}
            />
            <span>Autre (Nuisibles, Maintenance, Nettoyage, chaîne de froid, Production, Environnement…)</span>
          </label>
          {form.sousType === 'autre' && (
            <Input
              value={form.sousTypeAutrePrecision}
              disabled={dis}
              onChange={(e) => set('sousTypeAutrePrecision', e.target.value)}
              placeholder="Préciser…"
              style={{ marginTop: 10 }}
            />
          )}
        </div>
      </div>
    </div>,

    // Étape 2 — Description
    <div key="e2">
      <AideEtape etape={1} refDocument={form.refDocument} dis={dis} />

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 20, background: '#fbfcfb' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: C.texte }}>Description</h4>
        <Champ label="Étape" aide="Décrire le moment / l'étape du processus où la non-conformité a été constatée.">
          <Textarea rows={3} value={form.descriptionEtape} disabled={dis} onChange={(e) => set('descriptionEtape', e.target.value)} placeholder="Ex. : contrôle réception, étape d'emballage, contrôle final…" />
        </Champ>
        <Champ label="Preuve tangible" aide="Constat factuel justifiant la non-conformité (mesure, observation, écart relevé).">
          <Textarea rows={3} value={form.preuveTangible} disabled={dis} onChange={(e) => set('preuveTangible', e.target.value)} placeholder="Décrire la preuve tangible constatée…" />
        </Champ>
        <ZoneUpload
          label="Pièce jointe — preuve tangible"
          valeur={form.preuveTangibleFichier}
          disabled={dis}
          onChange={(nomFichier) => set('preuveTangibleFichier', nomFichier)}
        />
      </div>

      <Champ label="Description détaillée" aide="Faits constatés, conditions, lieu, date de constat, quantité concernée.">
        <Textarea rows={4} value={form.description} disabled={dis} onChange={(e) => set('description', e.target.value)} placeholder="Décrire les faits constatés, le contexte, les constats mesurables…" />
      </Champ>

      <Champ label="Type d'objet concerné" aide="Sélectionnez le type d'objet concerné par la non-conformité.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {TYPES_OBJET.map((t) => {
            const sel = form.typeObjet[0] === t;
            return (
              <label key={t} style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5,
                padding: '8px 14px', border: `1.5px solid ${sel ? C.green : C.borderFort}`,
                borderRadius: 8, cursor: dis ? 'default' : 'pointer',
                background: sel ? C.greenBg : '#fff', fontWeight: sel ? 600 : 400,
                color: sel ? C.greenFonce : C.texte, transition: 'all .15s',
              }}>
                <input type="radio" name="typeObjet" disabled={dis} checked={sel}
                  onChange={() => setForm((f) => ({ ...f, typeObjet: [t] }))}
                  style={{ accentColor: C.green }} />
                {t}
              </label>
            );
          })}
        </div>
      </Champ>

      <Champ label="Type de non-conformité" aide="La non-conformité concerne-t-elle un produit ou une prestation de service ?">
        <div style={{ display: 'flex', gap: 10 }}>
          {TYPES_NC.map((t) => {
            const sel = form.typeNonConformite === t;
            return (
              <label key={t} style={{
                flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13.5,
                padding: '9px 14px', border: `1.5px solid ${sel ? C.green : C.borderFort}`,
                borderRadius: 8, cursor: dis ? 'default' : 'pointer',
                background: sel ? C.greenBg : '#fff', fontWeight: sel ? 600 : 400,
                color: sel ? C.greenFonce : C.texte, transition: 'all .15s',
              }}>
                <input type="radio" name="typeNc" disabled={dis} checked={sel}
                  onChange={() => set('typeNonConformite', t)}
                  style={{ accentColor: C.green }} />
                {t}
              </label>
            );
          })}
        </div>
      </Champ>


      <Champ label="Criticité" aide="La criticité détermine le niveau de priorité et les alertes automatiques déclenchées.">
        <div style={{ display: 'flex', gap: 10 }}>
          {CRITICITES.map((c) => {
            const sel = form.criticite === c.v;
            return (
              <label key={c.v} style={{
                flex: 1, textAlign: 'center', padding: '11px 8px',
                border: `2px solid ${sel ? c.c : C.border}`,
                borderRadius: 9, cursor: dis ? 'default' : 'pointer',
                fontWeight: 700, fontSize: 13,
                background: sel ? c.bg : '#fff', color: sel ? c.c : C.texteDoux,
                transition: 'all .15s',
              }}>
                <input type="radio" name="crit" disabled={dis} checked={sel} onChange={() => set('criticite', c.v)} style={{ display: 'none' }} />
                {c.l}
              </label>
            );
          })}
        </div>
        {form.criticite === 'critique' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, background: C.rougeBg, border: `1px solid #f0cfcc`, borderRadius: 8, padding: '10px 13px' }}>
            <span style={{ color: C.rouge, display: 'flex', flexShrink: 0 }}><IAlerte t={16} /></span>
            <span style={{ fontSize: 12.5, color: C.rouge, lineHeight: 1.5 }}>
              Une NC critique déclenche une alerte SMS/email immédiate au RQ et au DG dès la soumission (délai contractuel &lt; 30 s).
            </span>
          </div>
        )}
      </Champ>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Champ label="Exigence non respectée" aide="Référence normative, contractuelle ou réglementaire violée.">
          <Textarea value={form.exigence} disabled={dis} onChange={(e) => set('exigence', e.target.value)} placeholder="Ex. : ISO 9001 §8.7, cahier des charges client…" />
        </Champ>
        <Champ label="Conséquences constatées" aide="Impacts qualité, sécurité, délais, coûts.">
          <Textarea value={form.consequences} disabled={dis} onChange={(e) => set('consequences', e.target.value)} />
        </Champ>
      </div>
      <Champ label="Risques associés" aide="Risques potentiels si la NC n'est pas traitée.">
        <Textarea value={form.risques} disabled={dis} onChange={(e) => set('risques', e.target.value)} />
      </Champ>

      <Champ label="Réalisé par" obligatoire aide="Nom de l'émetteur ayant rédigé cette description (rempli par l'émetteur).">
        <Input value={form.descriptionRealiseePar || form.emetteur} disabled={dis}
          onChange={(e) => set('descriptionRealiseePar', e.target.value)}
          placeholder="Prénom NOM" />
      </Champ>
    </div>,

    // Étape 3 — Action immédiate
    <div key="e3">
      <AideEtape etape={2} refDocument={form.refDocument} dis={dis} />
      <Champ label="Une action immédiate a-t-elle été menée ?" aide="Confinement, isolation, retrait, communication client…">
        <div style={{ display: 'flex', gap: 14 }}>
          {['oui', 'non'].map((o) => {
            const sel = form.actionImmediate === o;
            return (
              <label key={o} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
                padding: '10px 20px', border: `1.5px solid ${sel ? C.green : C.border}`,
                borderRadius: 8, cursor: dis ? 'default' : 'pointer',
                background: sel ? C.greenBg : '#fff', fontWeight: sel ? 700 : 400,
                color: sel ? C.greenFonce : C.texte, transition: 'all .15s',
              }}>
                <input type="radio" name="ai" disabled={dis} checked={sel} onChange={() => set('actionImmediate', o)} style={{ display: 'none' }} />
                {o === 'oui' ? 'Oui, une action a été menée' : 'Non, aucune action immédiate'}
              </label>
            );
          })}
        </div>
      </Champ>
      {form.actionImmediate === 'oui' && (
        <>
          <Champ label="Description de l'action réalisée">
            <Textarea value={form.actionRealisee} disabled={dis} onChange={(e) => set('actionRealisee', e.target.value)} placeholder="Décrire précisément l'action de confinement ou de correction immédiate…" />
          </Champ>
          <Champ label="Réalisée par">
            <Input value={form.realiseePar} disabled={dis} onChange={(e) => set('realiseePar', e.target.value)} placeholder="Prénom NOM" />
          </Champ>
        </>
      )}

      {/* --- Nouvelle section transfert, juste après l'action immédiate --- */}
      <SectionTransfert
        titre="Transférer la fiche par email"
        dis={dis}
        ncId={nc?.id}
        ncNumero={nc?.numero}
      />
    </div>,

    // Étape 4 — Vérifié par + Classification, puis Analyse 5M + 5 Pourquoi
    <div key="e4">
      <AideEtape etape={3} refDocument={form.refDocument} dis={dis} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <Champ label="Vérifié par" obligatoire aide="Nom et prénom de la personne ayant vérifié l'identification de la non-conformité.">
          <Input value={form.verifiePar} disabled={dis} onChange={(e) => set('verifiePar', e.target.value)} placeholder="Prénom NOM" />
        </Champ>
        <Champ label="Classification de la NC" aide="La classification majeure ou critique peut déclencher des procédures d'escalade.">
          <Select value={form.classification} disabled={dis} onChange={(e) => set('classification', e.target.value)}>
            <option value="">— Choisir la classification —</option>
            <option value="mineure">Mineure — impact limité, pas de risque immédiat</option>
            <option value="majeure">Majeure — impact significatif sur qualité ou délai</option>
            <option value="critique">Critique — risque sécurité, conformité réglementaire</option>
          </Select>
        </Champ>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.green, display: 'flex' }}><IDoc5M t={18} /></span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.texte }}>Diagramme Ishikawa — Méthode 5M</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          ['mainOeuvre', "Main d'œuvre", 'Compétences, formation, comportement du personnel'],
          ['methode', 'Méthode', 'Procédures, instructions, modes opératoires'],
          ['materiel', 'Matériel', 'Machines, équipements, outillages, infrastructures'],
          ['milieu', 'Milieu', 'Environnement : température, humidité, bruit, espace'],
          ['matiere', 'Matière', 'Matières premières, composants, fournitures'],
        ].map(([k, l, aide]) => (
          <div key={k} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', background: '#fbfcfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: C.greenBg, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>M</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.texte }}>{l}</span>
                <span style={{ fontSize: 12, color: C.texteFaible, marginLeft: 8 }}>{aide}</span>
              </div>
            </div>
            <Champ label="Cause identifiée">
              <Textarea rows={2} value={form.analyse.cinqM[k]} disabled={dis}
                onChange={(e) => setM(k, e.target.value)}
                placeholder={`Cause liée à : ${l.toLowerCase()}…`} />
            </Champ>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.texteDoux, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: C.green, display: 'flex' }}><IEclair t={14} /></span>
                Méthode des 5 Pourquoi (remontée à la cause racine)
              </div>

              {(form.analyse.pourquoiParM?.[k] || [ligneVide()]).map((ligne, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10,
                  padding: '10px 12px', background: C.surfaceAlt, borderRadius: 8,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.greenBg, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.texteDoux }}>Itération {i + 1}</span>
                    {!dis && (form.analyse.pourquoiParM?.[k] || []).length > 1 && (
                      <button onClick={() => retirerLignePourquoi(k, i)} style={{ marginLeft: 'auto', background: C.rougeBg, border: `1px solid #f0cfcc`, color: C.rouge, cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                        Retirer
                      </button>
                    )}
                  </div>
                  <Champ label="Pourquoi ?">
                    <Input
                      value={ligne.pourquoi}
                      disabled={dis}
                      onChange={(e) => setLignePourquoi(k, i, 'pourquoi', e.target.value)}
                      placeholder="Pourquoi ce problème est-il survenu ?"
                    />
                  </Champ>
                  <Champ label="Parce que…">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Input
                        value={ligne.parceque}
                        disabled={dis}
                        onChange={(e) => setLignePourquoi(k, i, 'parceque', e.target.value)}
                        placeholder="Parce que… (ou cliquez sur ✦ Suggérer pour une proposition IA)"
                        style={{ flex: 1 }}
                      />
                      {!dis && (
                        <BoutonIA
                          pourquoi={ligne.pourquoi}
                          causeM={form.analyse.cinqM[k]}
                          axeM={k}
                          iteration={i + 1}
                          historiqueIterations={form.analyse.pourquoiParM?.[k] || []}
                          form={form}
                          onSuggestion={(suggestion) => setLignePourquoi(k, i, 'parceque', suggestion)}
                          disabled={dis}
                          apiKey={GROQ_API_KEY}
                        />
                      )}
                    </div>
                  </Champ>
                </div>
              ))}

              {!dis && (
                <Btn variant="ghost" onClick={() => ajouterLignePourquoi(k)}>
                  <IPlus t={14} /> Ajouter Pourquoi / Parce que
                </Btn>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>,

    // Étape 5 — CAPA
    <div key="e5">
      <AideEtape etape={4} refDocument={form.refDocument} dis={dis} />
      <PlanCapa actions={form.capa.actions} disabled={dis} onChange={(actions) => set('capa', { actions })} />

      <SectionTransfert
        titre="Transférer la fiche par email"
        dis={dis}
        ncId={nc?.id}
        ncNumero={nc?.numero}
      />
    </div>,

    // Étape 6 — Vérification & Clôture
    <div key="e6">
      <AideEtape etape={5} refDocument={form.refDocument} dis={dis} />

      <div style={{ marginBottom: 22 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 700, color: C.texte }}>
          Preuves de mise en œuvre des actions correctives
        </h4>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: C.texteDoux }}>
          Une section par responsable assigné à une action corrective (étape Plans CAPA).
        </p>

        {actionsCapa.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 18px', background: C.surfaceAlt, borderRadius: 10, color: C.texteFaible, fontSize: 13 }}>
            Aucune action corrective définie à l'étape « Plans CAPA ».
          </div>
        )}

        {actionsCapa.map((action, idx) => {
          const resp = action.responsable?.nom || `Responsable ${idx + 1}`;
          const valeurs = form.cloture.parResponsable[idx] || {};
          return (
            <div key={idx} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 14, background: '#fbfcfb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: C.greenBg, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                <div>
                  <strong style={{ fontSize: 13.5, color: C.texte }}>{resp}</strong>
                  <div style={{ fontSize: 12, color: C.texteFaible }}>{action.libelle || 'Action corrective'}</div>
                </div>
              </div>

              <Champ label="Action réalisée" aide="Description de l'action effectivement mise en œuvre par le responsable.">
                <Textarea rows={2} value={valeurs.realisation || ''} disabled={dis}
                  onChange={(e) => setParResponsable(idx, 'realisation', e.target.value)}
                  placeholder="Décrire l'action réalisée…" />
              </Champ>

              <ZoneUpload
                label="Document justificatif"
                valeur={valeurs.fichier || ''}
                disabled={dis}
                onChange={(nomFichier) => setParResponsable(idx, 'fichier', nomFichier)}
              />

              <Champ label="Décision">
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['accepte', 'Accepter', C.greenFonce, C.greenBg], ['rejete', 'Rejeter', C.rouge, C.rougeBg]].map(([v, l, coul, fond]) => {
                    const sel = valeurs.decision === v;
                    return (
                      <label key={v} style={{
                        flex: 1, textAlign: 'center', padding: '9px 10px',
                        border: `2px solid ${sel ? coul : C.border}`, borderRadius: 8,
                        cursor: dis ? 'default' : 'pointer', fontWeight: 700, fontSize: 12.5,
                        background: sel ? fond : '#fff', color: sel ? coul : C.texteDoux,
                      }}>
                        <input type="radio" name={`decision-${idx}`} disabled={dis} checked={sel}
                          onChange={() => setParResponsable(idx, 'decision', v)} style={{ display: 'none' }} />
                        {l}
                      </label>
                    );
                  })}
                </div>
              </Champ>
            </div>
          );
        })}

        {actionsCapa.length > 0 && (
          <Champ label="Vérifié par" aide="Une seule vérification globale pour l'ensemble des actions correctives ci-dessus.">
            <Input value={form.cloture.verifieParActions || ''} disabled={dis}
              onChange={(e) => setCloture('verifieParActions', e.target.value)}
              placeholder="Prénom NOM" />
          </Champ>
        )}
      </div>

      <Champ label="Vérification d'efficacité" obligatoire aide="L'évaluation doit être faite après un délai suffisant pour constater l'effet des actions.">
        <Select value={form.cloture.efficacite} disabled={dis} onChange={(e) => setCloture('efficacite', e.target.value)}>
          <option value="">— Évaluer l'efficacité —</option>
          <option value="Efficace">Efficace — la NC ne s'est pas reproduite</option>
          <option value="Inefficace">Inefficace — la NC persiste, revoir les actions</option>
        </Select>
      </Champ>

      <SectionTransfert
        titre="Transférer la fiche par email"
        dis={dis}
        ncId={nc?.id}
        ncNumero={nc?.numero}
      />

      <Champ label="Mise à jour des risques / SMI" aide="Indiquer si la base de risques ou le SMI a été mis à jour suite à cette NC.">
        <Textarea value={form.cloture.majRisques} disabled={dis} onChange={(e) => setCloture('majRisques', e.target.value)} />
      </Champ>
      <Champ label="Signature du DQRDD" obligatoire>
        <Input value={form.cloture.signatureRQ} disabled={dis} onChange={(e) => setCloture('signatureRQ', e.target.value)} placeholder="Prénom NOM du DQRDD" />
      </Champ>

      <SectionTransfert
        titre="Transférer la fiche par email"
        dis={false}
        ncId={nc?.id}
        ncNumero={nc?.numero}
      />
    </div>,
  ];

  return (
    <div className="apparition" style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px) 70px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(19px,2.6vw,23px)', fontWeight: 700, color: C.texte, margin: 0, letterSpacing: '-.01em' }}>
            {nc?.numero
              ? <span style={{ fontFamily: C.policeMono, color: C.green }}>{nc.numero}</span>
              : 'Nouvelle fiche'}
          </h1>
          <p style={{ fontSize: 13, color: C.texteDoux, margin: '5px 0 0', fontFamily: C.policeMono }}>
            Fiche de non-conformité · réf. {form.refDocument || REF_PAR_DEFAUT}
          </p>
        </div>
        {nc && <BadgeStatut statut={nc.statut} />}
      </div>

      <Carte plat><FriseStatut statut={nc?.statut || 'brouillon'} /></Carte>

      <ResumeRapide nc={nc} form={form} />

      {msg && (
        <div style={{ padding: '11px 15px', borderRadius: 10, marginBottom: 16, fontSize: 13.5, fontWeight: 500,
          background: msg.type === 'ok' ? C.greenBg : C.rougeBg, color: msg.type === 'ok' ? C.greenFonce : C.rouge,
          border: `1px solid ${msg.type === 'ok' ? C.greenBord : '#f0cfcc'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          {msg.type === 'ok' ? <ICheck t={17} /> : <IAlerte t={17} />}
          {msg.texte}
        </div>
      )}

      {verrouillee && (
        <div style={{ padding: '11px 15px', borderRadius: 10, marginBottom: 16, fontSize: 13.5, background: C.greenBg, color: C.greenFonce, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${C.greenBord}` }}>
          <ICadenas t={17} /> Fiche clôturée et verrouillée — consultation en lecture seule.
        </div>
      )}

      {bandeauGroqManquant}

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {ETAPES.map((e, i) => (
          <button key={e.titre} onClick={() => setEtape(i)} style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${etape === i ? C.green : C.border}`,
            background: etape === i ? C.green : C.surface, color: etape === i ? '#fff' : C.texteDoux,
            transition: 'all .15s',
          }}>{i + 1}. {e.titre}</button>
        ))}
      </div>

      <div style={{ height: 5, background: C.bgVoile, borderRadius: 4, marginBottom: 22, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((etape + 1) / ETAPES.length) * 100}%`, background: `linear-gradient(90deg,${C.green},${C.greenFonce})`, transition: 'width .3s', borderRadius: 4 }} />
      </div>

      <Carte titre={`${etape + 1}. ${ETAPES[etape].titre}`}>{etapes[etape]}</Carte>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Btn variant="ghost" disabled={etape === 0} onClick={() => setEtape((s) => s - 1)}>
          <IRetour t={16} /> Précédent
        </Btn>
        <Btn variant="ghost" disabled={etape === ETAPES.length - 1} onClick={() => setEtape((s) => s + 1)}>
          Suivant <IFleche t={16} />
        </Btn>
      </div>

      <Carte titre="Actions sur la fiche">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {!verrouillee && (
            <Btn variant="ghost" disabled={enCours} onClick={enregistrer}>
              <IEnregistrer t={16} /> Enregistrer le brouillon
            </Btn>
          )}
          {(!nc || dispo('soumettre')) && !verrouillee && etape === ETAPES.length - 1 && is('admin', 'rq') && (
            <Btn variant="primary" disabled={enCours} onClick={soumettre}>
              <IEnvoi t={16} /> Clôturer
            </Btn>
          )}
          {dispo('prendre_en_charge') && (
            <Btn variant="primary" disabled={enCours} onClick={() => faireTransition('prendre_en_charge')}>
              <ILecture t={16} /> Prendre en charge
            </Btn>
          )}
          {dispo('cloturer') && (
            <Btn variant="fonce" disabled={enCours} onClick={() => faireTransition('cloturer')}>
              <ICheck t={16} /> Clôturer la NC
            </Btn>
          )}
        </div>
        {nc?.assigneA && (
          <div style={{ marginTop: 14, padding: '10px 13px', background: C.surfaceAlt, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ color: C.green, display: 'flex' }}><IUser t={16} /></span>
            <span style={{ fontSize: 13, color: C.texteDoux }}>
              Assignée à : <strong style={{ color: C.texte }}>{nc.assigneA.nom}</strong>
              <span style={{ marginLeft: 6, color: C.texteFaible }}>— {nc.assigneA.role}</span>
            </span>
          </div>
        )}
      </Carte>
    </div>
  );
}

function PlanCapa({ actions, disabled, onChange }) {
  const maj = (i, cle, val) => onChange(actions.map((a, j) => (j === i ? { ...a, [cle]: val } : a)));
  const majResp = (i, cle, val) => onChange(actions.map((a, j) => (j === i ? { ...a, responsable: { ...(a.responsable || {}), [cle]: val } } : a)));
  const ajouter = () => onChange([...actions, { libelle: '', responsable: { nom: '', tel: '' }, echeance: '', statut: 'a_faire' }]);
  const retirer = (i) => onChange(actions.filter((_, j) => j !== i));

  const STATUTS_CAPA = [
    { v: 'a_faire', l: 'À faire', c: C.bleu },
    { v: 'en_cours', l: 'En cours', c: C.orange },
    { v: 'terminee', l: 'Terminée', c: C.greenFonce },
  ];

  return (
    <div>
      {actions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 20px', background: C.surfaceAlt, borderRadius: 10, marginBottom: 16, color: C.texteDoux }}>
          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.borderFort }}><ICalendrier t={36} /></span>
          <p style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune action corrective</p>
          <p style={{ fontSize: 13 }}>Définissez les actions correctives et préventives (CAPA) à mener.</p>
        </div>
      )}
      {actions.map((a, i) => (
        <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: '#fbfcfb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 13.5, color: C.texte, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.greenBg, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              Action corrective
            </strong>
            {!disabled && (
              <button onClick={() => retirer(i)} style={{
                background: C.rougeBg, border: `1px solid #f0cfcc`, color: C.rouge,
                cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 7, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                Retirer
              </button>
            )}
          </div>
          <Champ label="Description de l'action">
            <Input value={a.libelle} disabled={disabled} onChange={(e) => maj(i, 'libelle', e.target.value)} placeholder="Décrire l'action corrective ou préventive…" />
          </Champ>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12 }}>
            <Champ label="Responsable">
              <Input value={a.responsable?.nom || ''} disabled={disabled} onChange={(e) => majResp(i, 'nom', e.target.value)} placeholder="Prénom NOM" />
            </Champ>
            <Champ label="Téléphone (rappel SMS)">
              <Input value={a.responsable?.tel || ''} disabled={disabled} onChange={(e) => majResp(i, 'tel', e.target.value)} placeholder="+226…" />
            </Champ>
            <Champ label="Échéance">
              <Input type="date" value={a.echeance || ''} disabled={disabled} onChange={(e) => maj(i, 'echeance', e.target.value)} />
            </Champ>
            <Champ label="Avancement">
              <Select value={a.statut} disabled={disabled} onChange={(e) => maj(i, 'statut', e.target.value)}>
                {STATUTS_CAPA.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </Select>
            </Champ>
          </div>
        </div>
      ))}
      {!disabled && (
        <Btn variant="ghost" onClick={ajouter}>
          <IPlus t={16} /> Ajouter une action corrective
        </Btn>
      )}
      <div style={{ marginTop: 14, padding: '10px 13px', background: C.surfaceAlt, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ color: C.orange, display: 'flex', flexShrink: 0, marginTop: 1 }}><IHorloge t={15} /></span>
        <span style={{ fontSize: 12.5, color: C.texteDoux, lineHeight: 1.5 }}>
          Un rappel SMS automatique est envoyé au responsable <strong>3 jours avant chaque échéance</strong> (J-3).
        </span>
      </div>
    </div>
  );
}


