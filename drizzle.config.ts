import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("Database environment variables are missing, check your .env file");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || '192.168.10.157',
    database: process.env.DB_NAME || 'kemenkopmk_db_clone',
    user: process.env.DB_USER || 'sipd',
    password: process.env.DB_PASSWORD || 's1n3rgh1@',
    port: 3306
  },
});
