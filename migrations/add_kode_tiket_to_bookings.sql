-- Menambahkan kolom kode_tiket ke tabel zoom_bookings
ALTER TABLE zoom_bookings ADD COLUMN kode_tiket VARCHAR(255) NULL AFTER purpose;
