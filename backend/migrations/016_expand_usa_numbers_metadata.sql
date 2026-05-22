ALTER TABLE usa_numbers
    ADD COLUMN service_name VARCHAR(120) NOT NULL DEFAULT 'USA Number' AFTER phone_number,
    ADD COLUMN category VARCHAR(120) NOT NULL DEFAULT 'WhatsApp' AFTER service_name;
