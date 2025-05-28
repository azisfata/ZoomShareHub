-- Nonaktifkan pengecekan foreign key sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus foreign key constraint yang bermasalah jika ada
ALTER TABLE zoom_bookings 
DROP FOREIGN KEY IF EXISTS zoom_bookings_ibfk_1;

-- Ubah kolom user_id agar tidak memerlukan foreign key
ALTER TABLE zoom_bookings 
MODIFY COLUMN user_id INT NOT NULL;

-- Aktifkan kembali pengecekan foreign key
SET FOREIGN_KEY_CHECKS = 1;
