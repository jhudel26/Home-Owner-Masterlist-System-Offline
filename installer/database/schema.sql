-- ============================================================================
-- Residential Masterlist — Production Database Schema
-- Applied automatically on first run by the application launcher.
-- Safe to re-run: all statements use IF NOT EXISTS / INSERT IGNORE.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS residential_masterlist
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE residential_masterlist;

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            VARCHAR(36)  PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user',
  permissions   JSON NOT NULL,
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email  (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homeowners (
  id                   VARCHAR(36)  PRIMARY KEY,
  hoa_number           VARCHAR(20)  UNIQUE,
  -- Name
  first_name           VARCHAR(100) NOT NULL,
  middle_name          VARCHAR(100),
  last_name            VARCHAR(100) NOT NULL,
  suffix               VARCHAR(50),
  full_name            VARCHAR(255),
  -- Ownership
  ownership_type       ENUM('owner','renter') NOT NULL DEFAULT 'owner',
  tenure_date          DATE,
  -- Property owner (for renters)
  owner_first_name     VARCHAR(100),
  owner_middle_name    VARCHAR(100),
  owner_last_name      VARCHAR(100),
  owner_suffix         VARCHAR(50),
  -- Address
  home_number          VARCHAR(50),
  block_number         VARCHAR(50)  NOT NULL,
  lot_number           VARCHAR(50)  NOT NULL,
  street_name          VARCHAR(255),
  barangay             VARCHAR(100) NOT NULL,
  -- Personal
  gender               ENUM('male','female','other') NOT NULL,
  birthdate            DATE         NOT NULL,
  age                  INT,
  contact_number       VARCHAR(50),
  email                VARCHAR(255),
  photo_path           VARCHAR(255),
  -- GA Proxy
  ga_proxy_designated  VARCHAR(255),
  ga_proxy_first_name  VARCHAR(100),
  ga_proxy_middle_name VARCHAR(100),
  ga_proxy_last_name   VARCHAR(100),
  ga_proxy_suffix      VARCHAR(50),
  ga_proxy_birthdate   DATE,
  ga_proxy_gender      ENUM('male','female','other'),
  ga_proxy_mobile      VARCHAR(50),
  ga_proxy_email       VARCHAR(255),
  ga_proxy_photo_path  VARCHAR(255),
  -- Extra
  registered_pets      INT NOT NULL DEFAULT 0,
  notes                TEXT,
  -- System
  created_by           VARCHAR(36),
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_hoa_number    (hoa_number),
  INDEX idx_status        (is_active),
  INDEX idx_ownership_type(ownership_type),
  INDEX idx_created_at    (created_at),
  INDEX idx_block_lot     (block_number, lot_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS household_members (
  id           VARCHAR(36)  PRIMARY KEY,
  homeowner_id VARCHAR(36)  NOT NULL,
  member_name  VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  INDEX idx_homeowner_id (homeowner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    VARCHAR(36),
  user_name  VARCHAR(255) NOT NULL,
  action     VARCHAR(100) NOT NULL,
  details    JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_user_id    (user_id),
  INDEX idx_action     (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  event_name       VARCHAR(100) NOT NULL,
  path             VARCHAR(500),
  visitor_id       VARCHAR(64),
  user_id          VARCHAR(36),
  device           VARCHAR(50),
  browser          VARCHAR(50),
  operating_system VARCHAR(50),
  referrer         TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_event_name (event_name),
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_created_at (created_at),
  INDEX idx_path       (path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(128) PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_dues (
  id                    VARCHAR(36)    PRIMARY KEY,
  homeowner_id          VARCHAR(36)    NOT NULL,
  year                  INT            NOT NULL,
  month                 INT            NOT NULL COMMENT '1-12',
  amount                DECIMAL(10,2)  NOT NULL DEFAULT 100.00,
  status                ENUM('paid','unpaid') NOT NULL DEFAULT 'unpaid',
  official_receipt_number VARCHAR(100),
  payment_date          DATE,
  created_by            VARCHAR(36),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)   REFERENCES profiles(id)   ON DELETE SET NULL,
  UNIQUE KEY unique_homeowner_month (homeowner_id, year, month),
  INDEX idx_homeowner_id (homeowner_id),
  INDEX idx_year_month   (year, month),
  INDEX idx_status       (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homeowner_deductions (
  id                    VARCHAR(36)    PRIMARY KEY,
  homeowner_id          VARCHAR(36)    NOT NULL,
  deduction_type        VARCHAR(100)   NOT NULL COMMENT 'e.g., Electricity, Services, Maintenance',
  deduction_amount      DECIMAL(10,2)  NOT NULL,
  reason                TEXT,
  effective_date        DATE           NOT NULL,
  created_by            VARCHAR(36),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)   REFERENCES profiles(id)   ON DELETE SET NULL,
  INDEX idx_homeowner_id (homeowner_id),
  INDEX idx_effective_date (effective_date),
  INDEX idx_deduction_type (deduction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hoa_officers (
  id                   VARCHAR(36)  PRIMARY KEY,
  homeowner_id         VARCHAR(36)  NOT NULL,
  position             VARCHAR(100) NOT NULL,
  committees           JSON COMMENT 'Array of committee assignments',
  term_start_date      DATE         NOT NULL,
  term_end_date        DATE,
  exempt_from_dues     TINYINT(1)   NOT NULL DEFAULT 0,
  exempt_start_date    DATE,
  exempt_end_date      DATE,
  priority             INT          NOT NULL DEFAULT 0,
  notes                TEXT,
  created_by           VARCHAR(36),
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)   REFERENCES profiles(id)   ON DELETE SET NULL,
  INDEX idx_homeowner_id (homeowner_id),
  INDEX idx_position     (position),
  INDEX idx_priority     (priority),
  INDEX idx_term_dates  (term_start_date, term_end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
  ('monthly_dues_amount', '100.00'),
  ('hoa_name', 'St. Joseph Village 6 Phase 4 HOA'),
  ('hoa_currency', '₱');

-- ============================================================================
-- HOA# AUTO-GENERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS hoa_number_sequence (
  id         INT PRIMARY KEY DEFAULT 1,
  next_value INT NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO hoa_number_sequence (id, next_value) VALUES (1, 1);

DROP TRIGGER IF EXISTS before_homeowner_insert;

-- Note: DELIMITER trick doesn't work in all clients; we use a single-statement
-- wrapper. The trigger body is valid standard SQL.
CREATE TRIGGER before_homeowner_insert
BEFORE INSERT ON homeowners
FOR EACH ROW
BEGIN
  DECLARE next_num INT;
  IF NEW.hoa_number IS NULL OR NEW.hoa_number = '' THEN
    SELECT next_value INTO next_num FROM hoa_number_sequence WHERE id = 1;
    SET NEW.hoa_number = CONCAT('SJV6PH4-', LPAD(next_num, 5, '0'));
    UPDATE hoa_number_sequence SET next_value = next_num + 1 WHERE id = 1;
  END IF;
END;

-- ============================================================================
-- APPLICATION USER (created by db-init, not here — password set at runtime)
-- ============================================================================
-- The db-init.js script creates the rml_app user with the configured password.

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
