ALTER TABLE usa_numbers
  ADD COLUMN IF NOT EXISTS otp_code_normalized VARCHAR(64) NULL AFTER otp_code,
  ADD COLUMN IF NOT EXISTS provider_label VARCHAR(120) NULL AFTER service_name;

UPDATE usa_numbers
SET otp_code_normalized = REGEXP_REPLACE(COALESCE(otp_code, ''), '[^0-9]', '')
WHERE otp_code IS NOT NULL AND otp_code <> '';

UPDATE usa_numbers
SET provider_label = COALESCE(NULLIF(TRIM(service_name), ''), 'Verified Number')
WHERE provider_label IS NULL;
