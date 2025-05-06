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
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
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
  
  constructor() {
    this.sessionStore = new MySQLSessionStore({ 
      // Konfigurasi MySQL session store
      host: process.env.DB_HOST || '192.168.10.157',
      port: 3306,
      user: process.env.DB_USER || 'sipd',
      password: process.env.DB_PASSWORD || 's1n3rgh1@',
      database: process.env.DB_NAME || 'kemenkopmk_db_clone',
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // MySQL tidak mendukung returning(), jadi kita insert dulu lalu query
    const result = await db.insert(users).values(user);
    const insertId = getInsertId(result);
    const [newUser] = await db.select().from(users).where(eq(users.id, insertId));
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    // Create the booking first with pending status and no zoom account
    const result = await db.insert(bookings).values({
      ...insertBooking,
      zoomAccountId: null,
      status: "pending"
    });
    
    const insertId = getInsertId(result);
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, insertId));
    
    // Find available Zoom account
    const availableAccount = await this.getAvailableZoomAccount(
      booking.meetingDate,
      booking.startTime,
      booking.endTime
    );
    
    if (availableAccount) {
      // Update the booking with the available zoom account
      await db.update(bookings)
        .set({
          zoomAccountId: availableAccount.id,
          status: "confirmed"
        })
        .where(eq(bookings.id, booking.id));
      
      const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
      return updatedBooking;
    }
    
    return booking;
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
    
    // Find the first account that doesn't have time conflicts
    for (const account of activeAccounts) {
      const accountIsBooked = bookingsOnDate.some(booking => {
        // Skip if the booking is not for this account
        if (booking.zoomAccountId !== account.id) return false;
        
        // Check for time overlap
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        
        const hasOverlap = 
          (startTime >= bookingStart && startTime < bookingEnd) || 
          (endTime > bookingStart && endTime <= bookingEnd) ||
          (startTime <= bookingStart && endTime >= bookingEnd);
        
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
