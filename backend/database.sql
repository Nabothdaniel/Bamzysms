-- BamzySMS Database Schema
-- SMSBower-powered version

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    sms_units INT DEFAULT 0,
    role ENUM('user', 'admin') DEFAULT 'user',
    referral_code VARCHAR(50),
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    description VARCHAR(255),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
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

-- Migration: if upgrading from the old schema, run these manually:
-- ALTER TABLE sms_purchases
--   ADD COLUMN activation_id BIGINT NOT NULL DEFAULT 0 AFTER user_id,
--   ADD COLUMN service_code VARCHAR(20) NOT NULL DEFAULT '' AFTER activation_id,
--   ADD COLUMN service_name VARCHAR(150) NOT NULL DEFAULT '' AFTER service_code,
--   ADD COLUMN country_name VARCHAR(100) NOT NULL DEFAULT '' AFTER service_name,
--   ADD COLUMN activation_cost DECIMAL(10,4) DEFAULT 0.0000,
--   MODIFY COLUMN status ENUM('pending','received','completed','cancelled','expired') DEFAULT 'pending',
--   ADD INDEX idx_activation_id (activation_id);

CREATE TABLE IF NOT EXISTS usa_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL UNIQUE,
    receive_code_link TEXT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_usa_numbers_status (status),
    INDEX idx_usa_numbers_uploaded_by (uploaded_by)
);
