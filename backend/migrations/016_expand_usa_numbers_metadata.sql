SET @dbname = DATABASE();
SET @tablename = 'usa_numbers';

SET @service_name_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'service_name'
);

SET @preparedStatement = IF(
    @service_name_exists = 0,
    'ALTER TABLE usa_numbers ADD COLUMN service_name VARCHAR(120) NOT NULL DEFAULT ''USA Number'' AFTER phone_number',
    'SELECT 1'
);
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @category_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'category'
);

SET @preparedStatement = IF(
    @category_exists = 0,
    'ALTER TABLE usa_numbers ADD COLUMN category VARCHAR(120) NOT NULL DEFAULT ''WhatsApp'' AFTER service_name',
    'SELECT 1'
);
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
