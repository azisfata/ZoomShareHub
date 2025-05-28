-- Langkah 1: Nonaktifkan foreign key checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Langkah 2: Perbaiki struktur tabel users jika diperlukan
ALTER TABLE users 
MODIFY COLUMN id INT AUTO_INCREMENT,
ADD PRIMARY KEY (id);

-- Langkah 3: Periksa dan perbaiki struktur tabel zoom_bookings
-- Hapus foreign key constraint yang bermasalah jika ada
ALTER TABLE zoom_bookings 
DROP FOREIGN KEY IF EXISTS zoom_bookings_ibfk_1;

-- Pastikan kolom user_id ada dan tipe datanya sesuai
ALTER TABLE zoom_bookings 
MODIFY COLUMN user_id INT NOT NULL;

-- Tambahkan foreign key constraint yang benar
ALTER TABLE zoom_bookings 
ADD CONSTRAINT fk_zoom_bookings_users 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Langkah 4: Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
