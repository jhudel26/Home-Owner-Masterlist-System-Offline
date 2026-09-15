-- ============================================================================
-- St. Joseph Village 6 Phase 4 — Homeowners Masterlist Complete Database Setup
-- ============================================================================
-- MySQL/MariaDB compatible
-- This is a comprehensive SQL file that combines all migrations and fixes
-- Import this file in phpMyAdmin to create/fix the complete database
-- Last updated: 2025-01-09
-- ============================================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS residential_masterlist CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE residential_masterlist;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (user accounts and authentication)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  permissions JSON NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Homeowners table
-- Aligned with Register New Homeowner form sections
CREATE TABLE IF NOT EXISTS homeowners (
  id VARCHAR(36) PRIMARY KEY,

  -- HOA# (Homeowner Association Number)
  hoa_number VARCHAR(20) UNIQUE,

  -- SECTION 1: Principal Homeowner Information - Name Fields
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  suffix VARCHAR(50),
  full_name VARCHAR(255),

  -- SECTION 1: Ownership Fields
  ownership_type ENUM('owner', 'renter') NOT NULL DEFAULT 'owner',
  tenure_date DATE,

  -- SECTION 1: Property Owner Information (for renters)
  owner_first_name VARCHAR(100),
  owner_middle_name VARCHAR(100),
  owner_last_name VARCHAR(100),
  owner_suffix VARCHAR(50),

  -- SECTION 1: Address Fields
  home_number VARCHAR(50),
  block_number VARCHAR(50) NOT NULL,
  lot_number VARCHAR(50) NOT NULL,
  street_name VARCHAR(255),
  barangay VARCHAR(100) NOT NULL,

  -- SECTION 1: Personal Information
  gender ENUM('male', 'female', 'other') NOT NULL,
  birthdate DATE NOT NULL,
  age INT,
  contact_number VARCHAR(50),
  email VARCHAR(255),
  photo_path VARCHAR(255),

  -- SECTION 3: GA Proxy Information
  ga_proxy_designated VARCHAR(255),
  ga_proxy_first_name VARCHAR(100),
  ga_proxy_middle_name VARCHAR(100),
  ga_proxy_last_name VARCHAR(100),
  ga_proxy_suffix VARCHAR(50),
  ga_proxy_birthdate DATE,
  ga_proxy_gender ENUM('male', 'female', 'other'),
  ga_proxy_mobile VARCHAR(50),
  ga_proxy_email VARCHAR(255),
  ga_proxy_photo_path VARCHAR(255),

  -- SECTION 4: Additional Information
  registered_pets INT NOT NULL DEFAULT 0,
  notes TEXT,

  -- System Fields
  created_by VARCHAR(36),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_hoa_number (hoa_number),
  INDEX idx_status (is_active),
  INDEX idx_ownership_type (ownership_type),
  INDEX idx_created_at (created_at),
  INDEX idx_block_lot (block_number, lot_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Household members table
-- SECTION 2: Household Members Registry
CREATE TABLE IF NOT EXISTS household_members (
  id VARCHAR(36) PRIMARY KEY,
  homeowner_id VARCHAR(36) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  INDEX idx_homeowner_id (homeowner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analytics events table (local analytics)
CREATE TABLE IF NOT EXISTS analytics_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  path VARCHAR(500),
  visitor_id VARCHAR(64),
  user_id VARCHAR(36),
  device VARCHAR(50),
  browser VARCHAR(50),
  operating_system VARCHAR(50),
  referrer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_event_name (event_name),
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_created_at (created_at),
  INDEX idx_path (path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table (for session management)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monthly dues table (for tracking monthly association dues payments)
CREATE TABLE IF NOT EXISTS monthly_dues (
  id VARCHAR(36) PRIMARY KEY,
  homeowner_id VARCHAR(36) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL COMMENT '1-12 for January-December',
  amount DECIMAL(10,2) NOT NULL DEFAULT 100.00 COMMENT 'Monthly dues amount in Pesos',
  status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  official_receipt_number VARCHAR(100),
  payment_date DATE,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (homeowner_id) REFERENCES homeowners(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_homeowner_month (homeowner_id, year, month),
  INDEX idx_homeowner_id (homeowner_id),
  INDEX idx_year_month (year, month),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HOA# AUTO-GENERATION SYSTEM
-- ============================================================================

-- Create sequence table to track HOA# counter
CREATE TABLE IF NOT EXISTS hoa_number_sequence (
  id INT PRIMARY KEY DEFAULT 1,
  next_value INT NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Initialize sequence if not exists
INSERT IGNORE INTO hoa_number_sequence (id, next_value) VALUES (1, 1);

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS before_homeowner_insert;

-- Create trigger to auto-generate HOA# on insert
DELIMITER $$

CREATE TRIGGER before_homeowner_insert
BEFORE INSERT ON homeowners
FOR EACH ROW
BEGIN
  DECLARE next_num INT;
  
  -- Only generate HOA# if not provided
  IF NEW.hoa_number IS NULL OR NEW.hoa_number = '' THEN
    -- Get next sequence number
    SELECT next_value INTO next_num FROM hoa_number_sequence WHERE id = 1;
    
    -- Generate HOA# with format SJV6PH4-XXXXX (5-digit zero-padded)
    SET NEW.hoa_number = CONCAT('SJV6PH4-', LPAD(next_num, 5, '0'));
    
    -- Increment sequence
    UPDATE hoa_number_sequence SET next_value = next_num + 1 WHERE id = 1;
  END IF;
END$$

DELIMITER ;

-- Update existing records with HOA# (if any exist before this migration)
SET @row_number = 0;
UPDATE homeowners 
SET hoa_number = CONCAT('SJV6PH4-', LPAD(@row_number := @row_number + 1, 5, '0'))
WHERE hoa_number IS NULL OR hoa_number = '';

-- ============================================================================
-- DATA FIXES
-- ============================================================================

-- Fix corrupted image data (clear invalid base64 strings)
UPDATE homeowners 
SET photo_path = NULL 
WHERE photo_path IS NOT NULL 
AND (
  photo_path NOT LIKE 'data:image/%' 
  OR photo_path NOT LIKE '%base64,%'
  OR LENGTH(photo_path) < 50
  OR photo_path LIKE '%/6/%'
  OR photo_path LIKE '%/oKSl%'
  OR photo_path LIKE '%,%' AND LENGTH(SUBSTRING_INDEX(photo_path, ',', -1)) < 10
);

UPDATE homeowners 
SET ga_proxy_photo_path = NULL 
WHERE ga_proxy_photo_path IS NOT NULL 
AND (
  ga_proxy_photo_path NOT LIKE 'data:image/%' 
  OR ga_proxy_photo_path NOT LIKE '%base64,%'
  OR LENGTH(ga_proxy_photo_path) < 50
  OR ga_proxy_photo_path LIKE '%/6/%'
  OR ga_proxy_photo_path LIKE '%/oKSl%'
  OR ga_proxy_photo_path LIKE '%,%' AND LENGTH(SUBSTRING_INDEX(ga_proxy_photo_path, ',', -1)) < 10
);

-- Fix corrupted permissions in profiles table
UPDATE profiles 
SET permissions = JSON_OBJECT(
  'can_create_homeowner', true,
  'can_edit_homeowner', true,
  'can_delete_homeowner', true,
  'can_view_homeowner', true,
  'can_export_excel', true,
  'can_manage_monthly_dues', true,
  'can_manage_users', true,
  'can_grant_permissions', true,
  'can_view_dashboard_stats', true,
  'can_backup_restore', true,
  'can_view_analytics', true
)
WHERE role = 'super_admin' AND (permissions IS NULL OR permissions = '' OR JSON_VALID(permissions) = 0);

UPDATE profiles 
SET permissions = JSON_OBJECT(
  'can_create_homeowner', true,
  'can_edit_homeowner', true,
  'can_delete_homeowner', true,
  'can_view_homeowner', true,
  'can_export_excel', true,
  'can_manage_monthly_dues', true,
  'can_manage_users', false,
  'can_grant_permissions', false,
  'can_view_dashboard_stats', true,
  'can_backup_restore', false,
  'can_view_analytics', false
)
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '' OR JSON_VALID(permissions) = 0);

UPDATE profiles 
SET permissions = JSON_OBJECT(
  'can_create_homeowner', false,
  'can_edit_homeowner', false,
  'can_delete_homeowner', false,
  'can_view_homeowner', true,
  'can_export_excel', false,
  'can_manage_monthly_dues', false,
  'can_manage_users', false,
  'can_grant_permissions', false,
  'can_view_dashboard_stats', false,
  'can_backup_restore', false,
  'can_view_analytics', false
)
WHERE role = 'user' AND (permissions IS NULL OR permissions = '' OR JSON_VALID(permissions) = 0);

-- Add can_manage_monthly_dues permission to existing users who don't have it
UPDATE profiles 
SET permissions = JSON_SET(
  permissions, 
  '$.can_manage_monthly_dues', 
  true
)
WHERE role IN ('super_admin', 'admin') AND JSON_EXTRACT(permissions, '$.can_manage_monthly_dues') IS NULL;

-- Ensure all homeowners have is_active set (fix any NULL values)
UPDATE homeowners SET is_active = 1 WHERE is_active IS NULL;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================
-- Note: No default admin account is created.
-- The first user will be created through the initial setup wizard when the webapp is first accessed.
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES (OPTIONAL - Uncomment to verify setup)
-- ============================================================================

-- Verify table structure
-- SELECT 'Database setup completed successfully' as status;

-- Verify homeowners table columns (only if table exists)
-- SELECT 
--     COLUMN_NAME, 
--     DATA_TYPE, 
--     IS_NULLABLE, 
--     COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'residential_masterlist' 
-- AND TABLE_NAME = 'homeowners' 
-- ORDER BY ORDINAL_POSITION;

-- Check homeowners data summary (only if table exists)
-- SELECT 
--   COUNT(*) as total_homeowners, 
--   SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_homeowners,
--   SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_homeowners,
--   SUM(CASE WHEN hoa_number IS NOT NULL THEN 1 ELSE 0 END) as with_hoa_number
-- FROM homeowners;

-- Check image data summary (only if table exists)
-- SELECT 
--   COUNT(*) as total_homeowners,
--   SUM(CASE WHEN photo_path IS NOT NULL THEN 1 ELSE 0 END) as photos_with_images,
--   SUM(CASE WHEN ga_proxy_photo_path IS NOT NULL THEN 1 ELSE 0 END) as proxy_photos_with_images
-- FROM homeowners;

-- Check profiles and permissions (only if table exists)
-- SELECT 
--   id, 
--   full_name, 
--   email, 
--   role, 
--   CHAR_LENGTH(permissions) as permissions_length,
--   JSON_VALID(permissions) as is_valid_json
-- FROM profiles;

-- ============================================================================
-- COMPLETE
-- ============================================================================
