-- Migration 015: Create usa_numbers table (separate from manual_numbers / Telegram)
-- Admin uploads USA phone numbers + a redirect URL.
-- On purchase the backend GETs that URL to retrieve the OTP automatically.

CREATE TABLE IF NOT EXISTS usa_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL,
    service_name VARCHAR(120) NOT NULL DEFAULT 'USA Number',
    category VARCHAR(120) NOT NULL DEFAULT 'WhatsApp',
    redirect_url TEXT NOT NULL COMMENT 'URL to GET for fetching the OTP',
    sell_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    otp_code TEXT NULL COMMENT 'Last OTP fetched from the redirect URL (stored plain for quick display)',
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
