-- Admin Settings Migration

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default markup settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('price_markup_multiplier', '1.5');
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('usd_to_ngn_rate', '1600');
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('admin_email_notifications', 'admin@bamzysms.com');

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
