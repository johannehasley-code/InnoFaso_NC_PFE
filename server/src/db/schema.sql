CREATE DATABASE innofaso_nc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE innofaso_nc;

CREATE TABLE IF NOT EXISTS nc (
  id VARCHAR(64) PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'brouillon',
  cree_le DATETIME(3) NOT NULL,
  maj_le DATETIME(3) NOT NULL,
  emetteur VARCHAR(120),
  service VARCHAR(60),
  intitule VARCHAR(255),
  description TEXT,
  criticite VARCHAR(20),
  classification VARCHAR(20),
  type_objet JSON,
  analyse JSON,
  capa JSON,
  cloture JSON,
  assigne_a JSON,
  historique JSON,
  evenements JSON,
  INDEX idx_statut (statut),
  INDEX idx_service (service),
  INDEX idx_criticite (criticite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compteur_numero (
  annee SMALLINT PRIMARY KEY,
  valeur INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;