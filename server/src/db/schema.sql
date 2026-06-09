-- ============================================================================
--  schema.sql — Schéma de la base de données MySQL « Innofaso NC »
--  À exécuter une seule fois pour créer la base et les tables.
--
--  Depuis un terminal :
--     mysql -u root -p < server/src/db/schema.sql
--
--  (ou copier-coller dans phpMyAdmin / MySQL Workbench)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS innofaso_nc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE innofaso_nc;

-- ----------------------------------------------------------------------------
--  Table principale : une ligne = une fiche de non-conformité.
--  Les structures imbriquées (analyse 5M, plans CAPA, clôture, historique,
--  événements, types d'objet) sont stockées en colonnes JSON natives MySQL.
--  C'est volontaire : ces sous-objets n'ont de sens qu'au sein d'une fiche,
--  et le JSON évite une dizaine de tables filles pour un prototype clair.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nc (
  id             VARCHAR(64)  NOT NULL,
  numero         VARCHAR(32)  NOT NULL,
  statut         VARCHAR(20)  NOT NULL DEFAULT 'brouillon',
  cree_le        DATETIME(3)  NOT NULL,
  maj_le         DATETIME(3)  NOT NULL,

  -- Identification
  emetteur       VARCHAR(160) NOT NULL DEFAULT '',
  service        VARCHAR(60)  NOT NULL DEFAULT '',
  intitule       VARCHAR(255) NOT NULL DEFAULT '',
  description    TEXT,

  -- Caractérisation
  criticite      VARCHAR(20)  NOT NULL DEFAULT 'moyenne',
  classification VARCHAR(60)  NOT NULL DEFAULT '',
  type_objet     JSON,

  -- Analyse / CAPA / clôture (sous-objets)
  analyse        JSON,
  capa           JSON,
  cloture        JSON,

  -- Affectation & traçabilité
  assigne_a      JSON,
  historique     JSON,
  evenements     JSON,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_numero (numero),
  KEY idx_statut (statut),
  KEY idx_service (service),
  KEY idx_criticite (criticite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  Séquence des numéros lisibles FNC-AAAA-NNNN, un compteur par année.
--  L'incrément atomique se fait via LAST_INSERT_ID (voir storeMysql.js).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compteur_numero (
  annee  INT NOT NULL,
  valeur INT NOT NULL DEFAULT 0,
  PRIMARY KEY (annee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
