-- Periksa apakah kolom metadata ada
SET @dbname = DATABASE();
SET @tablename = 'zoom_bookings';
SET @columnname = 'metadata';
SET @preparedStatement = '';

-- Siapkan pernyataan untuk mengecek kolom
SET @checkColumn = CONCAT(
  'SELECT COUNT(*) INTO @columnExists FROM INFORMATION_SCHEMA.COLUMNS ', 
  'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?'
);

-- Eksekusi pernyataan pengecekan
PREPARE stmt FROM @checkColumn;
EXECUTE stmt USING @dbname, @tablename, @columnname;
DEALLOCATE PREPARE stmt;

-- Hapus kolom jika ada
SET @dropColumn = IF(
  @columnExists > 0,
  'ALTER TABLE zoom_bookings DROP COLUMN metadata',
  'SELECT 1'
);

-- Eksekusi pernyataan penghapusan
PREPARE stmt FROM @dropColumn;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
