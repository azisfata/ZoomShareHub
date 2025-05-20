-- Menambahkan kolom metadata ke tabel zoom_bookings
ALTER TABLE zoom_bookings ADD COLUMN metadata TEXT NULL AFTER purpose;
