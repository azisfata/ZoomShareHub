-- Membuat database jika belum ada
CREATE DATABASE IF NOT EXISTS `kemenkopmk_db_clone`;

-- Menggunakan database
USE `kemenkopmk_db_clone`;

-- Tabel untuk zoom_users
CREATE TABLE IF NOT EXISTS `zoom_users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `zoom_users_username_unique` (`username`)
);

-- Tabel untuk zoom_accounts
CREATE TABLE IF NOT EXISTS `zoom_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
);

-- Tabel untuk zoom_bookings
CREATE TABLE IF NOT EXISTS `zoom_bookings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `zoom_account_id` int,
  `meeting_title` varchar(255) NOT NULL,
  `meeting_date` varchar(50) NOT NULL,
  `start_time` varchar(50) NOT NULL,
  `end_time` varchar(50) NOT NULL,
  `department` varchar(255) NOT NULL,
  `participants` int NOT NULL,
  `purpose` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Tabel untuk zoom_sessions
CREATE TABLE IF NOT EXISTS `zoom_sessions` (
  `sid` varchar(255) NOT NULL,
  `sess` text NOT NULL,
  `expire` datetime NOT NULL,
  PRIMARY KEY (`sid`)
);

-- Indeks untuk zoom_sessions
CREATE INDEX IF NOT EXISTS `IDX_session_expire` ON `zoom_sessions` (`expire`);
