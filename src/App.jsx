import { useState, useEffect } from 'react';
import FicheNC from './FicheNC.jsx';
import Dashboard from './components/Dashboard.jsx';
import { api } from './lib/api.js';
import { Entete, Btn } from './components/ui.jsx';
import { IPlus, IRetour } from './components/Icones.jsx';

// Services par défaut — identiques au référentiel backend (organisation.js).
// Utilisés immédiatement ; remplacés par la réponse API dès que le backend répond.
const SERVICES_DEFAUT = [
  { code: 'production',   libelle: 'Production' },
  { code: 'qualite',      libelle: 'Qualité / SMI' },
  { code: 'logistique',   libelle: 'Logistique & Approvisionnement' },
  { code: 'maintenance',  libelle: 'Maintenance' },
  { code: 'commercial',   libelle: 'Commercial' },
];

export default function App() {
  const [vue, setVue] = useState('dashboard'); // 'dashboard' | 'fiche'
  const [ncId, setNcId] = useState(null);
  const [services, setServices] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setServices(SERVICES_DEFAUT);                      // affichage immédiat
    api.services().then(setServices).catch(() => {});  // remplacé si le backend répond
  }, []);

  const ouvrir = (id) => { setNcId(id); setVue('fiche'); };
  const nouveau = () => { setNcId(null); setVue('fiche'); };
  const retour = () => { setVue('dashboard'); setTick((t) => t + 1); };

  const droite = vue === 'dashboard'
    ? <Btn variant="primary" onClick={nouveau}><IPlus t={17} /> Nouvelle fiche</Btn>
    : <Btn variant="ghost" onClick={retour}><IRetour t={16} /> Tableau de bord</Btn>;

  return (
    <>
      <Entete
        sousTitre={vue === 'fiche' ? 'Fiche de non-conformité' : 'Gestion des non-conformités'}
        droite={droite}
      />
      {vue === 'fiche'
        ? <FicheNC key={ncId || 'nouveau'} ncId={ncId} services={services} onRetour={retour} onChangement={() => setTick((t) => t + 1)} />
        : <Dashboard onOuvrir={ouvrir} onNouveau={nouveau} rafraichir={tick} />}
    </>
  );
}
