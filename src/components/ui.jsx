import { C, COULEUR_STATUT, COULEUR_CRITICITE } from '../lib/theme.js';
import { IBouclier } from './Icones.jsx';
import logoInnofaso from '../assets/logo-innofaso.jpg';

// --- Badges ----------------------------------------------------------------
export function BadgeStatut({ statut }) {
  const s = COULEUR_STATUT[statut] || COULEUR_STATUT.brouillon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
      color: s.fg, background: s.bg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.fg }} />
      {s.libelle}
    </span>
  );
}

export function BadgeCriticite({ criticite }) {
  const c = COULEUR_CRITICITE[criticite] || COULEUR_CRITICITE.moyenne;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600,
      color: c.fg, background: c.bg, whiteSpace: 'nowrap',
      fontFamily: C.policeMono, letterSpacing: '.01em',
    }}>
      {c.libelle}
    </span>
  );
}

// --- Champs de formulaire --------------------------------------------------
export function Champ({ label, children, obligatoire, aide }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.texteDoux, marginBottom: 6, letterSpacing: '.01em' }}>
        {label} {obligatoire && <span style={{ color: C.rouge }}>*</span>}
      </span>
      {children}
      {aide && <span style={{ display: 'block', fontSize: 11.5, color: C.texteFaible, marginTop: 4 }}>{aide}</span>}
    </label>
  );
}

const baseInput = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${C.borderFort}`, fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: C.texte, outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
};
const focusProps = {
  onFocus: (e) => { e.target.style.borderColor = C.green; e.target.style.boxShadow = `0 0 0 3px ${C.greenBg}`; },
  onBlur: (e) => { e.target.style.borderColor = C.borderFort; e.target.style.boxShadow = 'none'; },
};
const dis = { background: C.surfaceAlt, color: C.texteDoux, cursor: 'not-allowed' };

export function Input({ disabled, ...props }) {
  return <input {...props} disabled={disabled} {...(disabled ? {} : focusProps)} style={{ ...baseInput, ...(disabled ? dis : {}) }} />;
}
export function Textarea({ disabled, rows = 3, ...props }) {
  return <textarea rows={rows} {...props} disabled={disabled} {...(disabled ? {} : focusProps)} style={{ ...baseInput, resize: 'vertical', lineHeight: 1.5, ...(disabled ? dis : {}) }} />;
}
export function Select({ disabled, children, ...props }) {
  return <select {...props} disabled={disabled} {...(disabled ? {} : focusProps)} style={{ ...baseInput, cursor: disabled ? 'not-allowed' : 'pointer', ...(disabled ? dis : {}) }}>{children}</select>;
}

// --- Bouton ----------------------------------------------------------------
export function Btn({ children, variant = 'primary', disabled, ...props }) {
  const styles = {
    primary: { background: C.green, color: '#fff', border: '1px solid transparent', boxShadow: C.ombre },
    fonce: { background: C.greenFonce, color: '#fff', border: '1px solid transparent' },
    ghost: { background: '#fff', color: C.texte, border: `1px solid ${C.borderFort}` },
    discret: { background: 'transparent', color: C.texteDoux, border: '1px solid transparent' },
    danger: { background: C.rouge, color: '#fff', border: '1px solid transparent' },
  }[variant];
  return (
    <button {...props} disabled={disabled} style={{
      padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'filter .15s, transform .05s', ...styles,
    }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'none')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
      {children}
    </button>
  );
}

// --- Carte -----------------------------------------------------------------
export function Carte({ titre, icone, children, action, plat }) {
  return (
    <section style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rGrand,
      padding: 22, marginBottom: 18, boxShadow: plat ? 'none' : C.ombreMoy,
    }}>
      {titre && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.texte, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
            {icone && <span style={{ color: C.green, display: 'flex' }}>{icone}</span>}
            {titre}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// --- Carte KPI (statistique) ----------------------------------------------
export function CarteKPI({ icone, valeur, label, couleur = C.green, fond = C.greenBg }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rGrand,
      padding: '18px 20px', boxShadow: C.ombre, display: 'flex', alignItems: 'center', gap: 15,
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 12, background: fond, color: couleur,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icone}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontFamily: C.policeMono, color: C.texte }}>{valeur}</div>
        <div style={{ fontSize: 12.5, color: C.texteDoux, marginTop: 5 }}>{label}</div>
      </div>
    </div>
  );
}

// --- En-tête d'application (marque Innofaso) -------------------------------
export function LogoInnofaso({ t = 50 }) {
  return (
    <img
      src={logoInnofaso}
      alt="InnoFaso"
      style={{ height: t, width: 'auto', flexShrink: 0, display: 'block' }}
    />
  );
}

export function Entete({droite, menuVisible = false, menuOuvert = false, onMenuClick}) {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: '0 16px 0 14px', position: 'sticky', top: 0, zIndex: 20,
      boxShadow: '0 1px 0 rgba(20,40,28,.03)',
    }}>
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: menuVisible ? 8 : 13, minWidth: 0 }}>
          {menuVisible && (
            <button onClick={onMenuClick} aria-label="Menu" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, flexShrink: 0, borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              color: C.texte, cursor: 'pointer',
            }}>
              {menuOuvert
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          )}
          <LogoInnofaso t={menuVisible ? 36 : 50} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: menuVisible ? 13.5 : 15.5, fontWeight: 700, color: C.texte, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
              Innofaso <span style={{ color: C.texteFaible, fontWeight: 500 }}>· Qualité</span>
            </div>
            {!menuVisible && (
              <div style={{ fontSize: 12, color: C.texteDoux, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Gestion des non-conformités
              </div>
            )}
          </div>
        </div>
        {droite}
      </div>
    </header>
  );
}

// --- Divers ----------------------------------------------------------------
export function Vide({ icone, titre, texte }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.texteDoux }}>
      <div style={{ color: C.borderFort, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{icone}</div>
      <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>{titre}</div>
      <div style={{ fontSize: 13 }}>{texte}</div>
    </div>
  );
}

