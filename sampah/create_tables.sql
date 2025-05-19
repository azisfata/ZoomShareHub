-- Tabel untuk zoom_users
CREATE TABLE IF NOT EXISTS `kemenkopmk_db_clone`.`zoom_users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  CONSTRAINT `zoom_users_id` PRIMARY KEY(`id`),
  CONSTRAINT `zoom_users_username_unique` UNIQUE(`username`)
);

-- Tabel untuk zoom_accounts
CREATE TABLE IF NOT EXISTS `kemenkopmk_db_clone`.`zoom_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  CONSTRAINT `zoom_accounts_id` PRIMARY KEY(`id`)
);

-- Tabel untuk zoom_bookings
CREATE TABLE IF NOT EXISTS `kemenkopmk_db_clone`.`zoom_bookings` (
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
  `needs_recording` boolean DEFAULT false,
  `needs_breakout_rooms` boolean DEFAULT false,
  `needs_polls` boolean DEFAULT false,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `zoom_bookings_id` PRIMARY KEY(`id`)
);

-- Tabel untuk zoom_sessions
CREATE TABLE IF NOT EXISTS `kemenkopmk_db_clone`.`zoom_sessions` (
  `sid` varchar(255) NOT NULL,
  `sess` text NOT NULL,
  `expire` datetime NOT NULL,
  PRIMARY KEY (`sid`)
);

-- Indeks untuk zoom_sessions
CREATE INDEX IF NOT EXISTS `IDX_session_expire` ON `kemenkopmk_db_clone`.`zoom_sessions` (`expire`);
