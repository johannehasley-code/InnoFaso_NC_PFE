// ============================================================================
//  theme.js — Système de design « Innofaso NC ».
//  Direction : utilitaire industriel raffiné. Vert Innofaso dominant,
//  typographie technique (IBM Plex Sans / Mono), profondeur douce.
// ============================================================================
export const C = {
  // Fonds & surfaces
  bg: '#F2F4F1',
  bgVoile: '#eef1ec',
  surface: '#ffffff',
  surfaceAlt: '#f7f9f6',
  border: '#e1e6df',
  borderFort: '#cbd3c8',

  // Texte
  texte: '#19241d',
  texteDoux: '#5a655d',
  texteFaible: '#8a938b',

  // Vert Innofaso (couleur de marque dominante)
  green: '#3A7D52',
  greenFonce: '#235e3c',
  greenEncreuse: '#16482c',
  greenBg: '#e9f3ec',
  greenBord: '#bfdcc9',

  // Accents fonctionnels
  rouge: '#b3261e',
  rougeBg: '#fbeceb',
  orange: '#a85b00',
  orangeBg: '#fbf0e2',
  bleu: '#28557f',
  bleuBg: '#e8f0f7',
  gris: '#7d877f',

  // Profondeur
  ombre: '0 1px 2px rgba(20,40,28,.05)',
  ombreMoy: '0 4px 16px -6px rgba(20,40,28,.14)',
  ombreFort: '0 12px 34px -10px rgba(20,40,28,.22)',

  // Typographie
  police: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  policeMono: "'IBM Plex Mono', ui-monospace, 'Courier New', monospace",

  // Rayons
  r: 10,
  rGrand: 16,
};

// Couleurs par statut du workflow.
export const COULEUR_STATUT = {
  brouillon: { fg: C.gris, bg: '#eef0ed', libelle: 'Brouillon' },
  ouverte: { fg: C.bleu, bg: C.bleuBg, libelle: 'Ouverte' },
  en_cours: { fg: C.orange, bg: C.orangeBg, libelle: 'En cours' },
  cloturee: { fg: C.greenFonce, bg: C.greenBg, libelle: 'Clôturée' },
};

export const COULEUR_CRITICITE = {
  faible: { fg: '#2f6b3c', bg: '#e9f3ec', libelle: 'Faible' },
  moyenne: { fg: C.bleu, bg: C.bleuBg, libelle: 'Moyenne' },
  elevee: { fg: C.orange, bg: C.orangeBg, libelle: 'Élevée' },
  critique: { fg: C.rouge, bg: C.rougeBg, libelle: 'Critique' },
};
