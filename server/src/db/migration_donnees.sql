-- Migration à exécuter UNE FOIS sur la base MySQL (Railway).
-- Ajoute la colonne JSON générique qui stocke tous les champs du formulaire
-- qui n'ont pas de colonne dédiée (refDocument, verifiePar, nomProduit,
-- fournisseur, lotFournisseur, lotInterne, quantiteRecue, quantiteAnomalie,
-- serviceConcerne, sousType, sousTypeAutrePrecision, exigence, consequences,
-- risques, actionImmediate, actionRealisee, realiseePar, typeNonConformite,
-- destinataires, etc.)
--
-- C'est l'absence de cette colonne (et le filtrage trop strict côté code)
-- qui causait la perte de ces champs quand une fiche était transmise à une
-- autre personne pour complétion.

ALTER TABLE nc ADD COLUMN IF NOT EXISTS donnees JSON NULL;
