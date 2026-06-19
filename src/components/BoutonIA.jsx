// ============================================================================
//  BoutonIA.jsx — Bouton "Suggérer avec l'IA" pour l'analyse 5 Pourquoi
//  Place ce fichier dans : src/components/BoutonIA.jsx
// ============================================================================

import { useState } from 'react';
import { C } from '../lib/theme.js';
import { proposerCause } from '../lib/groq.js';

// Icône IA (étoile / spark) inline — pas de dépendance externe
function IEtoileIA({ t = 14 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

// Spinner SVG léger
function Spinner() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin-ia 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`@keyframes spin-ia { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/**
 * BoutonIA — affiche un bouton compact "✦ Suggérer" à côté du champ "Parce que…".
 * Lorsqu'on clique, il appelle Groq et remplace / propose la valeur dans le champ.
 *
 * Props :
 *   pourquoi            {string}   Valeur du champ "Pourquoi ?" de la même ligne
 *   causeM              {string}   Cause 5M de la branche courante
 *   axeM                {string}   Clé M ('mainOeuvre', 'methode'…)
 *   iteration           {number}   Numéro de l'itération (1-indexé)
 *   historiqueIterations {Array}   Toutes les lignes de la branche M
 *   form                {object}   État complet du formulaire NC
 *   onSuggestion        {function} Callback appelé avec la suggestion (string)
 *   disabled            {boolean}  Désactivé si fiche verrouillée
 *   apiKey              {string}   VITE_GROQ_API_KEY
 */
export default function BoutonIA({
  pourquoi,
  causeM,
  axeM,
  iteration,
  historiqueIterations,
  form,
  onSuggestion,
  disabled,
  apiKey,
}) {
  const [etat, setEtat]       = useState('idle');   // idle | loading | ok | err
  const [erreur, setErreur]   = useState('');
  const [bulle, setBulle]     = useState(false);    // tooltip au survol

  const demander = async () => {
    if (etat === 'loading' || disabled) return;
    setEtat('loading');
    setErreur('');
    try {
      const suggestion = await proposerCause({
        pourquoi,
        causeM,
        axeM,
        iteration,
        historiqueIterations,
        form,
        apiKey,
      });
      onSuggestion(suggestion);
      setEtat('ok');
      setTimeout(() => setEtat('idle'), 2500);
    } catch (e) {
      setErreur(e.message);
      setEtat('err');
      setTimeout(() => setEtat('idle'), 5000);
    }
  };

  // Couleurs selon état
  const couleurs = {
    idle:    { bg: '#f0f7f3', border: C.greenBord, color: C.greenFonce },
    loading: { bg: '#f0f7f3', border: C.greenBord, color: C.greenFonce },
    ok:      { bg: C.greenBg, border: C.green,     color: C.greenFonce },
    err:     { bg: C.rougeBg, border: '#f0cfcc',   color: C.rouge      },
  };
  const { bg, border, color } = couleurs[etat];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      {/* Bulle d'aide */}
      {bulle && etat === 'idle' && (
        <div style={{
          position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
          background: C.texte, color: '#fff', fontSize: 11.5, borderRadius: 7,
          padding: '6px 10px', whiteSpace: 'nowrap', pointerEvents: 'none',
          zIndex: 99, boxShadow: C.ombreMoy,
        }}>
          {!apiKey
            ? '⚠ Clé Groq non configurée (VITE_GROQ_API_KEY)'
            : !pourquoi?.trim()
              ? 'Saisissez d\'abord le "Pourquoi ?"'
              : 'Générer une proposition de cause avec l\'IA'}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            border: '5px solid transparent', borderTopColor: C.texte,
          }} />
        </div>
      )}

      <button
        disabled={disabled || etat === 'loading'}
        onClick={demander}
        onMouseEnter={() => setBulle(true)}
        onMouseLeave={() => setBulle(false)}
        title="Suggérer une cause avec l'IA (Groq)"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 700, border: `1.5px solid ${border}`,
          background: bg, color, transition: 'all .2s',
          opacity: disabled ? 0.45 : 1,
          fontFamily: C.police,
          whiteSpace: 'nowrap',
        }}
      >
        {etat === 'loading' ? <Spinner /> : <IEtoileIA t={13} />}
        {etat === 'loading' ? 'Analyse…'
          : etat === 'ok'   ? '✓ Suggéré'
          : etat === 'err'  ? '✗ Erreur'
          : 'Suggérer'}
      </button>

      {/* Message d'erreur sous le bouton */}
      {etat === 'err' && erreur && (
        <div style={{
          fontSize: 11, color: C.rouge, background: C.rougeBg,
          border: `1px solid #f0cfcc`, borderRadius: 6,
          padding: '5px 9px', maxWidth: 260, lineHeight: 1.45,
        }}>
          {erreur}
        </div>
      )}
    </div>
  );
}