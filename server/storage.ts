import { 
  users, 
  zoomAccounts, 
  bookings, 
  type User, 
  type InsertUser, 
  type ZoomAccount, 
  type InsertZoomAccount,
  type Booking,
  type InsertBooking
} from "@shared/schema";
import session from "express-session";
import type { Store } from "express-session";
import MySQLStore from "express-mysql-session";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, or, not, gte, lte, desc, asc, sql } from "drizzle-orm";
import { getInsertId, getRowsAffected } from "./mysql-helpers";

const MySQLSessionStore = MySQLStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByLdapUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  getPegawaiById(pegawaiId: number): Promise<{id: number, nama: string, unit_kerja?: string} | null>;
  
  // Zoom account operations
  getZoomAccount(id: number): Promise<ZoomAccount | undefined>;
  getAllZoomAccounts(): Promise<ZoomAccount[]>;
  createZoomAccount(account: InsertZoomAccount): Promise<ZoomAccount>;
  updateZoomAccount(id: number, account: Partial<ZoomAccount>): Promise<ZoomAccount | undefined>;
  
  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  getAvailableZoomAccount(date: string, startTime: string, endTime: string): Promise<ZoomAccount | undefined>;
  
  // Session store
  sessionStore: Store;
}

export class DatabaseStorage implements IStorage {
  // Session store
  sessionStore: Store;
  
  // Mendapatkan data pegawai berdasarkan ID
  async getPegawaiById(pegawaiId: number): Promise<{id: number, nama: string, unit_kerja?: string} | null> {
    try {
      const [rows] = await pool.query(
        `SELECT p.id, p.nama, unit_kerja.nama_unit_kerja AS unit_kerja
         FROM pegawai p
         LEFT JOIN unit_kerja ON p.unit_kerja_id = unit_kerja.id
         WHERE p.id = ?`,
        [pegawaiId]
      ) as [any[], any];
      
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (error) {
      console.error('Error getting pegawai by ID:', error);
      return null;
    }
  }
  
  constructor() {
    this.sessionStore = new MySQLSessionStore({ 
      // Konfigurasi MySQL session store
      host: process.env.DB_HOST || '192.168.10.157',
      port: 3306,
      user: process.env.DB_USER || 'sipd',
      password: process.env.DB_PASSWORD || 's1n3rgh1@',
      database: process.env.DB_NAME || 'kemenkopmk_db',
      // Gunakan tabel zoom_sessions
      schema: {
        tableName: 'zoom_sessions',
        columnNames: {
          session_id: 'sid',
          expires: 'expire',
          data: 'sess'
        }
      }
    });
    
    // Ensure we have 20 Zoom accounts in the database
    this.initializeZoomAccounts();
  }
  
  private async initializeZoomAccounts() {
    // Check if we already have Zoom accounts
    const existingAccounts = await db.select().from(zoomAccounts);
    
    if (existingAccounts.length === 0) {
      // Initialize 20 Zoom accounts
      for (let i = 1; i <= 20; i++) {
        const account: InsertZoomAccount = {
          name: `Zoom Account ${i}`,
          username: `zoom${i}@company.com`,
          password: `SecurePassword${i}!`,
          isActive: true
        };
        await this.createZoomAccount(account);
      }
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Join ke tabel pegawai dan ambil pegawai.nama sebagai name
    // Join ke unit_kerja untuk ambil nama departemen (unit_kerja.nama_unit_kerja)
    const [rows] = await pool.query(
      `SELECT u.*, p.nama AS name, unit_kerja.nama_unit_kerja AS department
       FROM users u
       LEFT JOIN pegawai p ON u.pegawai_id = p.id
       LEFT JOIN unit_kerja ON p.unit_kerja_id = unit_kerja.id
       WHERE u.id = ?`,
      [id]
    ) as [User[], any];
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
    return undefined;
  }
  
  async getUserByLdapUsername(username: string): Promise<User | undefined> {
    console.log('Looking for user with username_ldap:', username);
    const [rows] = await pool.query(
      `SELECT u.*, p.nama AS name, unit_kerja.nama_unit_kerja AS department
       FROM users u
       LEFT JOIN pegawai p ON u.pegawai_id = p.id
       LEFT JOIN unit_kerja ON p.unit_kerja_id = unit_kerja.id
       WHERE u.username_ldap = ?`,
      [username]
    ) as [User[], any];
    
    console.log('Query result:', rows);
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Found user:', rows[0]);
      return rows[0];
    }
    console.log('No user found');
    return undefined;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // MySQL tidak mendukung returning(), jadi kita insert dulu lalu query
    const [result] = await pool.query(
      `INSERT INTO users (pegawai_id, username_ldap, password, role_id)
       VALUES (?, ?, ?, ?)`,
      [user.pegawai_id, user.username_ldap, user.password, user.role_id || 4]
    ) as [any, any];
    
    // Ambil user yang baru dibuat dengan join ke pegawai dan unit_kerja
    const [rows] = await pool.query(
      `SELECT u.*, p.nama AS name, unit_kerja.nama_unit_kerja AS department
       FROM users u
       LEFT JOIN pegawai p ON u.pegawai_id = p.id
       LEFT JOIN unit_kerja ON p.unit_kerja_id = unit_kerja.id
       WHERE u.id = ?`,
      [result.insertId]
    ) as [User[], any];
    
    if (!rows[0]) throw new Error('User created but not found');
    return rows[0];
  }
  
  async getAllUsers(): Promise<User[]> {
    const [rows] = await pool.query(
      `SELECT u.*, p.nama AS name, unit_kerja.nama_unit_kerja AS department
       FROM users u
       LEFT JOIN pegawai p ON u.pegawai_id = p.id
       LEFT JOIN unit_kerja ON p.unit_kerja_id = unit_kerja.id`
    ) as [User[], any];
    return rows;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return getRowsAffected(result) > 0;
  }
  
  // Zoom account operations
  async getZoomAccount(id: number): Promise<ZoomAccount | undefined> {
    const [account] = await db.select().from(zoomAccounts).where(eq(zoomAccounts.id, id));
    return account;
  }
  
  async getAllZoomAccounts(): Promise<ZoomAccount[]> {
    return await db.select().from(zoomAccounts);
  }
  
  async createZoomAccount(account: InsertZoomAccount): Promise<ZoomAccount> {
    const result = await db.insert(zoomAccounts).values(account);
    const insertId = getInsertId(result);
    const [zoomAccount] = await db.select().from(zoomAccounts).where(eq(zoomAccounts.id, insertId));
    return zoomAccount;
  }
  
  async updateZoomAccount(id: number, updates: Partial<ZoomAccount>): Promise<ZoomAccount | undefined> {
    await db.update(zoomAccounts).set(updates).where(eq(zoomAccounts.id, id));
    const [updatedAccount] = await db.select().from(zoomAccounts).where(eq(zoomAccounts.id, id));
    return updatedAccount;
  }
  
  // Booking operations
  async createBooking(insertBooking: InsertBooking): Promise<{booking: Booking | null, zoomAccount: ZoomAccount | null}> {
    // Cari dulu akun Zoom yang tersedia
    const availableAccount = await this.getAvailableZoomAccount(
      insertBooking.meetingDate,
      insertBooking.startTime,
      insertBooking.endTime
    );
    
    // Jika tidak ada akun yang tersedia, return null untuk booking
    if (!availableAccount) {
      return { booking: null, zoomAccount: null };
    }
    
    // Jika ada akun yang tersedia, buat booking baru dengan status confirmed
    const result = await db.insert(bookings).values({
      ...insertBooking,
      zoomAccountId: availableAccount.id,
      status: "confirmed"
    });
    
    const insertId = getInsertId(result);
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, insertId));
    
    return { booking, zoomAccount: availableAccount };
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }
  
  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return await db.select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }
  
  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }
  
  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    await db.update(bookings).set(updates).where(eq(bookings.id, id));
    const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return updatedBooking;
  }
  
  async getAvailableZoomAccount(date: string, startTime: string, endTime: string): Promise<ZoomAccount | undefined> {
    // Get all active Zoom accounts
    const activeAccounts = await db.select()
      .from(zoomAccounts)
      .where(eq(zoomAccounts.isActive, true));
    
    // Get all confirmed bookings for the given date that might have time conflicts
    const bookingsOnDate = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.meetingDate, date),
          eq(bookings.status, "confirmed"),
          not(eq(bookings.status, "cancelled"))
        )
      );
    
    // 1. Cek akun yang belum dipakai sama sekali di hari itu
    const usedAccountIds = new Set(bookingsOnDate.map(b => b.zoomAccountId));
    const unusedAccounts = activeAccounts.filter(acc => !usedAccountIds.has(acc.id));
    if (unusedAccounts.length > 0) {
      // Berikan akun yang belum dipakai sama sekali di hari itu
      return unusedAccounts[0];
    }

    // 2. Jika semua akun sudah dipakai di hari itu, cari akun yang tidak bentrok dengan booking baru (buffer 2 jam)
    for (const account of activeAccounts) {
      const accountIsBooked = bookingsOnDate.some(booking => {
        // Hanya cek booking pada akun ini
        if (booking.zoomAccountId !== account.id) return false;
        // Check for time overlap + buffer 2 jam setelah bookingEnd
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        function timeToMinutes(t: string) {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        }
        const bookingStartM = timeToMinutes(bookingStart);
        const bookingEndM = timeToMinutes(bookingEnd);
        const bookingStartWithBufferM = bookingStartM - 60; // buffer 1 jam sebelum mulai
        const bookingEndWithBufferM = bookingEndM + 60; // buffer 1 jam setelah selesai
        const startM = timeToMinutes(startTime);
        const endM = timeToMinutes(endTime);
        // Cek overlap dengan buffer 1 jam sebelum dan sesudah booking
        const hasOverlap =
          // Booking baru overlap dengan waktu booking + buffer
          (startM >= bookingStartWithBufferM && startM < bookingEndWithBufferM) ||
          (endM > bookingStartWithBufferM && endM <= bookingEndWithBufferM) ||
          (startM <= bookingStartWithBufferM && endM >= bookingEndWithBufferM);
        return hasOverlap;
      });
      if (!accountIsBooked) {
        return account;
      }
    }
    return undefined;
  }
}

export async function markCompletedBookings() {
  const today = new Date();
  today.setHours(0,0,0,0);
  // Ambil semua booking yang statusnya 'confirmed' dan meetingDate < hari ini
  const bookingsToComplete = await db.select().from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        lte(bookings.meetingDate, today.toISOString().split("T")[0])
      )
    );
  for (const booking of bookingsToComplete) {
    // Hanya tandai completed jika endTime sudah lewat hari ini atau tanggal sudah lewat
    const endDateTime = new Date(`${booking.meetingDate}T${booking.endTime || '23:59'}`);
    if (endDateTime < new Date()) {
      await db.update(bookings)
        .set({ status: "completed" })
        .where(eq(bookings.id, booking.id));
    }
  }
}

export const storage = new DatabaseStorage();
