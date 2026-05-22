-- BamzySMS Production Database Schema
-- Combined Schema for cPanel Deployment (April 2026)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
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

-- 2. Transactions Table
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

-- 3. Verifications Table
CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type ENUM('signup', 'reset') DEFAULT 'signup',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SMS Purchases Table (Powered by SMSBower)
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
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_activation_id (activation_id),
    INDEX idx_user_status (user_id, status)
);

-- 5. Admin Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Service Price Overrides
CREATE TABLE IF NOT EXISTS service_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(50) NOT NULL,
    country_id INT DEFAULT 0,
    multiplier DECIMAL(10, 2) DEFAULT NULL,
    fixed_price DECIMAL(15, 2) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY service_country (service_code, country_id)
);

-- 7. System Logs
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Core Migrations Tracker
CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Initial Seed Data
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES 
('price_markup_multiplier', '1.5'),
('usd_to_ngn_rate', '1600'),
('admin_email_notifications', 'admin@bamzysms.com');
