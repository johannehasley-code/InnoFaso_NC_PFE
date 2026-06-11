-- ================================================================
--  INNOFASO — Script MySQL complet
--  Coller dans phpMyAdmin > sélectionner innofaso_db > onglet SQL
-- ================================================================

USE innofaso_db;

-- ── ROLES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  label       VARCHAR(100) NOT NULL,
  permissions JSON         NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (name, label, permissions) VALUES
('operateur','Opérateur Terrain',
 '{"create_nc":true,"view_own_nc":true,"upload_files":true}'),
('responsable_service','Responsable de Service',
 '{"create_nc":true,"view_service_nc":true,"assign_capa":true,"update_nc":true}'),
('rq','Responsable Qualité',
 '{"view_all_nc":true,"close_nc":true,"validate_capa":true,"reports":true,"manage_users":true}'),
('direction','Direction Générale',
 '{"view_dashboard":true,"view_reports":true,"view_all_nc":true}'),
('admin','Administrateur',
 '{"all":true}');

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(100) NOT NULL,
  prenom           VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role_id          INT          NOT NULL,
  service          VARCHAR(100) DEFAULT NULL,
  actif            TINYINT(1)   DEFAULT 1,
  failed_attempts  INT          DEFAULT 0,
  locked_until     DATETIME     DEFAULT NULL,
  last_login       DATETIME     DEFAULT NULL,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mots de passe temporaires (remplacés par "npm run seed")
INSERT INTO users (nom, prenom, email, password_hash, role_id, service) VALUES
('Admin',    'Sys',      'admin@innofaso.bf',       'SEED_REQUIRED', 5, 'IT'),
('Nombre',   'Gilles',   'rq@innofaso.bf',          'SEED_REQUIRED', 3, 'Qualité'),
('Coulibaly','Oumar',    'dg@innofaso.bf',           'SEED_REQUIRED', 4, 'Direction'),
('Sawadogo', 'Ibrahim',  'chef@innofaso.bf',         'SEED_REQUIRED', 2, 'Production'),
('Diallo',   'Aminata',  'operateur@innofaso.bf',   'SEED_REQUIRED', 1, 'Production');

-- ── NON-CONFORMITES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS non_conformites (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  numero_nc        VARCHAR(20)  NOT NULL UNIQUE,
  titre            VARCHAR(255) NOT NULL,
  description      TEXT,
  service_emetteur VARCHAR(100),
  criticite        ENUM('observation','mineure','majeure','critique') DEFAULT 'mineure',
  statut           ENUM('brouillon','ouverte','en_cours','cloturee') DEFAULT 'brouillon',
  emetteur_id      INT,
  responsable_id   INT          DEFAULT NULL,
  date_detection   DATE,
  date_echeance    DATE         DEFAULT NULL,
  date_cloture     DATETIME     DEFAULT NULL,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (emetteur_id)    REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (responsable_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── AUDIT LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          DEFAULT NULL,
  action        VARCHAR(100) NOT NULL,
  target_table  VARCHAR(50)  DEFAULT NULL,
  target_id     INT          DEFAULT NULL,
  old_value     JSON         DEFAULT NULL,
  new_value     JSON         DEFAULT NULL,
  ip_address    VARCHAR(50)  DEFAULT NULL,
  user_agent    TEXT         DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Triggers immuabilité audit_logs
DELIMITER //
CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON audit_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs : modification interdite.';
END;//
CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON audit_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs : suppression interdite.';
END;//
DELIMITER ;

-- ── REFRESH TOKENS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  token       VARCHAR(600) NOT NULL UNIQUE,
  expires_at  DATETIME     NOT NULL,
  revoked     TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── INDEX ─────────────────────────────────────────────────────
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_date    ON audit_logs(created_at);
CREATE INDEX idx_nc_statut     ON non_conformites(statut);
CREATE INDEX idx_nc_criticite  ON non_conformites(criticite);
