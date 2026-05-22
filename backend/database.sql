-- BamzySMS Database Schema
-- SMSBower-powered version

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    username VARCHAR(255) NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    sms_units INT DEFAULT 0,
    role ENUM('user', 'admin') DEFAULT 'user',
    referral_code VARCHAR(50),
    token VARCHAR(255),
    transaction_pin VARCHAR(255),
    recovery_key VARCHAR(255) NULL,
    recovery_key_saved BOOLEAN DEFAULT FALSE,
    whatsapp_notifications BOOLEAN DEFAULT FALSE,
    whatsapp_number VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    description VARCHAR(255),
    external_ref VARCHAR(255) NULL UNIQUE COMMENT 'Provider transaction ID for idempotent webhook processing',
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type ENUM('signup', 'reset') DEFAULT 'signup',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMSBower-powered purchases table
-- activation_id: the ID returned by SMSBower (used for polling / status changes)
-- service_code:  the SMSBower short code e.g. "go", "wa", "tg"
-- service_name:  display name e.g. "Google, Gmail, Youtube"
-- country_name:  display name e.g. "Nigeria"
-- activation_cost: actual price charged by SMSBower (in USD as returned by API)
CREATE TABLE IF NOT EXISTS sms_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activation_id BIGINT NOT NULL,
    service_code VARCHAR(20) NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    activation_cost DECIMAL(10, 4) DEFAULT 0.0000,
    otp_code VARCHAR(20),
    status ENUM('pending', 'received', 'completed', 'cancelled', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_activation_id (activation_id),
    INDEX idx_user_status (user_id, status)
);

CREATE TABLE IF NOT EXISTS system_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- e.g., 'balance_updated', 'notification', 'otp_received'
    payload TEXT, -- JSON data
    is_delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_delivered (user_id, is_delivered)
);

CREATE TABLE IF NOT EXISTS manual_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL,
    country_id INT DEFAULT 0,
    country_name VARCHAR(100) NOT NULL,
    service_code VARCHAR(20) NOT NULL DEFAULT 'tg',
    service_name VARCHAR(100) NOT NULL DEFAULT 'Telegram',
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    sell_price DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255) NULL,
    otp_code_encrypted TEXT NULL,
    upload_batch VARCHAR(80) NULL,
    uploaded_by INT NOT NULL,
    sold_to INT NULL,
    status ENUM('available', 'sold', 'cancelled') DEFAULT 'available',
    sold_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_manual_phone_number (phone_number),
    KEY idx_manual_numbers_status_service (status, service_code),
    KEY idx_manual_numbers_sold_to (sold_to),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (sold_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS manual_number_cancellation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manual_number_id INT NOT NULL,
    user_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
    admin_note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_manual_cancel_status (status, created_at),
    KEY idx_manual_cancel_user (user_id),
    FOREIGN KEY (manual_number_id) REFERENCES manual_numbers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS usa_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL,
    service_name VARCHAR(120) NOT NULL DEFAULT 'USA Number',
    category VARCHAR(120) NOT NULL DEFAULT 'WhatsApp',
    redirect_url TEXT NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    otp_code TEXT NULL,
    uploaded_by INT NOT NULL,
    sold_to INT NULL,
    status ENUM('available', 'sold', 'cancelled') DEFAULT 'available',
    sold_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_usa_phone (phone_number),
    KEY idx_usa_status (status),
    KEY idx_usa_sold_to (sold_to),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (sold_to) REFERENCES users(id)
);

-- Migration: if upgrading from the old schema, run these manually:
-- ALTER TABLE users DROP COLUMN email;
-- ALTER TABLE sms_purchases
--   ADD COLUMN activation_id BIGINT NOT NULL DEFAULT 0 AFTER user_id,
--   ADD COLUMN service_code VARCHAR(20) NOT NULL DEFAULT '' AFTER activation_id,
--   ADD COLUMN service_name VARCHAR(150) NOT NULL DEFAULT '' AFTER service_code,
--   ADD COLUMN country_name VARCHAR(100) NOT NULL DEFAULT '' AFTER service_name,
--   ADD COLUMN activation_cost DECIMAL(10,4) DEFAULT 0.0000,
--   MODIFY COLUMN status ENUM('pending','received','completed','cancelled','expired') DEFAULT 'pending',
--   ADD INDEX idx_activation_id (activation_id);
