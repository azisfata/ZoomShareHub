-- Create zoom_sessions table for session storage
CREATE TABLE IF NOT EXISTS `zoom_sessions` (
  `sid` VARCHAR(255) NOT NULL PRIMARY KEY,
  `sess` JSON NOT NULL,
  `expire` DATETIME NOT NULL,
  INDEX `idx_expire` (`expire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
