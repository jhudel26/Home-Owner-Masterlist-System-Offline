-- ============================================================================
-- Database Migration Script for Existing Installations
-- Version: 2024-09-17
-- Description: Adds homeowner_deductions table and updates permissions system
-- ============================================================================

-- Create homeowner_deductions table for managing deduction privileges
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

-- Update system settings to include new permission indicators
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
  ('db_migration_version', '2024-09-17'),
  ('village_logo', '');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================