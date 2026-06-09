import { C, COULEUR_STATUT } from '../lib/theme.js';

const ORDRE = ['brouillon', 'ouverte', 'en_cours', 'cloturee'];

// Icône checkmark inline (évite un import circulaire ; même style que Icones.jsx).
const CheckTick = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export default function FriseStatut({ statut }) {
  const idxCourant = ORDRE.indexOf(statut);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
      {ORDRE.map((s, i) => {
        const atteint = i <= idxCourant;
        const courant = i === idxCourant;
        const couleur = COULEUR_STATUT[s];
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12.5, fontWeight: 700,
                background: atteint ? couleur.fg : '#eceeec',
                color: atteint ? '#fff' : C.gris,
                boxShadow: courant ? `0 0 0 4px ${couleur.bg}` : 'none',
                transition: 'all .25s',
              }}>
                {atteint ? <CheckTick /> : i + 1}
              </span>
              <span style={{
                fontSize: 13, fontWeight: courant ? 700 : 500,
                color: atteint ? C.texte : C.gris,
              }}>{couleur.libelle}</span>
            </div>
            {i < ORDRE.length - 1 && (
              <span style={{
                width: 38, height: 2, margin: '0 10px',
                background: i < idxCourant ? COULEUR_STATUT[ORDRE[i + 1]].fg : '#e0e3e0',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
