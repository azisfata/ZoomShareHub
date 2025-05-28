-- Buat tabel zoom_sessions jika belum ada
CREATE TABLE IF NOT EXISTS `zoom_sessions` (
  `session_id` VARCHAR(255) NOT NULL,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` TEXT,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
