import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan .env dimuat dengan path yang benar
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  // Tampilkan nilai env untuk debug
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

// Buat koneksi pool MySQL
export const pool = mysql.createPool(dbConfig);

// Inisialisasi Drizzle ORM dengan koneksi MySQL
export const db = drizzle(pool, { schema, mode: 'default' });