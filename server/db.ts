import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan .env dimuat dengan path yang benar
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
  // Tampilkan nilai DATABASE_URL untuk debug
  console.error('DATABASE_URL tidak ditemukan. Nilai env:', process.env);
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });