-- Nonaktifkan pengecekan foreign key sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus foreign key constraint yang bermasalah jika ada
ALTER TABLE zoom_bookings 
DROP FOREIGN KEY IF EXISTS zoom_bookings_ibfk_1;

-- Tambahkan foreign key constraint yang benar
ALTER TABLE zoom_bookings 
ADD CONSTRAINT fk_zoom_bookings_users 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Aktifkan kembali pengecekan foreign key
SET FOREIGN_KEY_CHECKS = 1;
