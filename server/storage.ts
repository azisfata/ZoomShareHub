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
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, or, not, gte, lte, desc, asc } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

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
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
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
    const [newUser] = await db.insert(users)
      .values(user)
      .returning();
    
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
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
    const [zoomAccount] = await db.insert(zoomAccounts).values(account).returning();
    return zoomAccount;
  }
  
  async updateZoomAccount(id: number, updates: Partial<ZoomAccount>): Promise<ZoomAccount | undefined> {
    const [updatedAccount] = await db
      .update(zoomAccounts)
      .set(updates)
      .where(eq(zoomAccounts.id, id))
      .returning();
    
    return updatedAccount;
  }
  
  // Booking operations
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    // Create the booking first with pending status and no zoom account
    const [booking] = await db.insert(bookings)
      .values({
        ...insertBooking,
        zoomAccountId: null,
        status: "pending"
      })
      .returning();
    
    // Find available Zoom account
    const availableAccount = await this.getAvailableZoomAccount(
      booking.meetingDate,
      booking.startTime,
      booking.endTime
    );
    
    if (availableAccount) {
      // Update the booking with the available zoom account
      const [updatedBooking] = await db.update(bookings)
        .set({
          zoomAccountId: availableAccount.id,
          status: "confirmed"
        })
        .where(eq(bookings.id, booking.id))
        .returning();
      
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
    const [updatedBooking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    
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
      const accountIsBooked = bookingsOnDate.some((booking) => {
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

export const storage = new DatabaseStorage();
