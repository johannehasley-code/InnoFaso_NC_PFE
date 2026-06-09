// ============================================================================
//  Icones.jsx — Bibliothèque d'icônes SVG professionnelles (style trait fin).
//  Dessinées à la main (pas de dépendance externe, pas d'emoji Unicode).
//  Toutes héritent de la couleur via `currentColor` et se dimensionnent via `t`.
// ============================================================================

function Svg({ t = 18, children, fill = 'none', strokeWidth = 1.7 }) {
  return (
    <svg
      width={t} height={t} viewBox="0 0 24 24"
      fill={fill} stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IJauge = (p) => (
  <Svg {...p}><path d="M12 13a4 4 0 0 1 4-4" /><path d="M12 21a9 9 0 1 1 9-9" /><path d="m12 13 4-4" /><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none" /></Svg>
);
export const IFiche = (p) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></Svg>
);
export const IAlerte = (p) => (
  <Svg {...p}><path d="M10.3 4 2.4 18a1.5 1.5 0 0 0 1.3 2.2h16.6a1.5 1.5 0 0 0 1.3-2.2L13.7 4a1.6 1.6 0 0 0-2.8 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>
);
export const ISms = (p) => (
  <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-4-.9L3 20l1-3.8A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" /><path d="M8 11h.01" /><path d="M12 11h.01" /><path d="M16 11h.01" /></Svg>
);
export const ICloche = (p) => (
  <Svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Svg>
);
export const ICheck = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.2 2.2L15.5 9.5" /></Svg>
);
export const IPlus = (p) => (
  <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);
export const IRetour = (p) => (
  <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>
);
export const IService = (p) => (
  <Svg {...p}><path d="M3 21h18" /><path d="M4 21V9l6-3v4l5-3v14" /><path d="M19 21V11l-4-2" /><path d="M8 13h.01" /><path d="M8 17h.01" /></Svg>
);
export const IUser = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></Svg>
);
export const IHorloge = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 1.8" /></Svg>
);
export const IRecherche = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Svg>
);
export const IEclair = (p) => (
  <Svg {...p}><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" /></Svg>
);
export const IBouclier = (p) => (
  <Svg {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const IFleche = (p) => (
  <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
);
export const ICalendrier = (p) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /></Svg>
);
export const ICircuit = (p) => (
  <Svg {...p}><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.4 6H15a3 3 0 0 1 3 3v6.6" /></Svg>
);
export const IDoc5M = (p) => (
  <Svg {...p}><path d="M12 5v14" /><path d="M5 9l7-4 7 4" /><path d="M5 9v6l7 4 7-4V9" /></Svg>
);
export const IEnregistrer = (p) => (
  <Svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-7H7v7" /><path d="M7 3v5h7" /></Svg>
);
export const IEnvoi = (p) => (
  <Svg {...p}><path d="M21 3 3 10.5l6.5 2.5L12 21l3-7 6-11Z" /><path d="m9.5 13 5.5-7" /></Svg>
);
export const ILecture = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" stroke="none" /></Svg>
);
export const ICadenas = (p) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></Svg>
);
