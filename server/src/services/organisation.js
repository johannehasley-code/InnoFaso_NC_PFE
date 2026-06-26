export const SERVICES = {
  production: {
    code: 'production',
    libelle: 'Production',
    pilote: { nom: 'OUEDRAOGO Adama', role: 'Pilote Production', tel: '+22670000001', email: 'seraphin.yougbare@innofaso.com' },
  },
  qualite: {
    code: 'qualite',
    libelle: 'Qualité / SMI',
    pilote: { nom: 'KABORE Aïcha', role: 'Pilote Qualité', tel: '+22670000002', email: 'johannehasleydiessongo@gmail.com' },
  },
  logistique: {
    code: 'logistique',
    libelle: 'Logistique & Approvisionnement',
    pilote: { nom: 'SAWADOGO Issa', role: 'Pilote Logistique', tel: '+22670000003', email: 'johannehasleydiessongo@gmail.com' },
  },
  maintenance: {
    code: 'maintenance',
    libelle: 'Maintenance',
    pilote: { nom: 'COMPAORE Boukary', role: 'Pilote Maintenance', tel: '+22670000004', email: 'johannehasleydiessongo@gmail.com' },
  },
  commercial: {
    code: 'commercial',
    libelle: 'Commercial',
    pilote: { nom: 'ZONGO Mariam', role: 'Pilote Commercial', tel: '+22670000005', email: 'johannehasleydiessongo@gmail.com' },
  },
  admin_finance: {
    code: 'admin_finance',
    libelle: 'Administration et Finance',
    pilote: { nom: '—', role: 'Pilote Administration et Finance', tel: '', email: 'johannehasleydiessongo@gmail.com' },
  },
  ressources_humaines: {
    code: 'ressources_humaines',
    libelle: 'Ressources Humaines',
    pilote: { nom: '—', role: 'Pilote Ressources Humaines', tel: '', email: 'johannehasleydiessongo@gmail.com' },
  },
};

export const RQ = { nom: 'TRAORE Salif', role: 'Responsable Qualité (RQ)', tel: '+22670000010', email: 'johannehasleydiessongo@gmail.com' };
export const DG = { nom: 'NIKIEMA Pascal', role: 'Directeur Général (DG)', tel: '+22670000011', email: 'johannehasleydiessongo@gmail.com' };

export function listeServices() {
  return Object.values(SERVICES).map((s) => ({
    code: s.code,
    libelle: s.libelle,
    pilote: s.pilote,
  }));
}

export function piloteDuService(codeService) {
  const s = SERVICES[codeService];
  if (!s) return null;
  return s.pilote;
}