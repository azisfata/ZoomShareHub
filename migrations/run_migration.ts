import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan .env dimuat dengan path yang benar
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('Env DB tidak ditemukan. Nilai env:', process.env);
  throw new Error(
    "Env DB harus diatur. Apakah Anda lupa untuk mengatur database?",
  );
}

// Konfigurasi koneksi MySQL
const dbConfig = {
  host: process.env.DB_HOST || '192.168.10.157',
  database: process.env.DB_NAME || 'kemenkopmk_db',
  user: process.env.DB_USER || 'sipd',
  password: process.env.DB_PASSWORD || 's1n3rgh1@',
};

async function runMigration() {
  console.log('Menjalankan migrasi database...');
  
  try {
    // Buat koneksi MySQL
    const connection = await mysql.createConnection(dbConfig);
    
    // Baca file SQL untuk menghapus kolom metadata
    const sql = fs.readFileSync(path.resolve(__dirname, './remove_metadata_from_bookings.sql'), 'utf8');
    
    // Jalankan query
    console.log('Menjalankan query:', sql);
    await connection.query(sql);
    
    console.log('Migrasi berhasil dijalankan!');
    
    // Tutup koneksi
    await connection.end();
  } catch (error) {
    console.error('Error saat menjalankan migrasi:', error);
  }
}

// Jalankan migrasi
runMigration();
