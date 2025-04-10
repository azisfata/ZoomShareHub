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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

export class MemStorage implements IStorage {
  // Storage maps
  private users: Map<number, User>;
  private zoomAccounts: Map<number, ZoomAccount>;
  private bookings: Map<number, Booking>;
  
  // Counters for IDs
  private userIdCounter: number;
  private zoomAccountIdCounter: number;
  private bookingIdCounter: number;
  
  // Session store
  sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.zoomAccounts = new Map();
    this.bookings = new Map();
    
    this.userIdCounter = 1;
    this.zoomAccountIdCounter = 1;
    this.bookingIdCounter = 1;
    
    this.initializeZoomAccounts();

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
  }
  
  private initializeZoomAccounts() {
    // Initialize 20 Zoom accounts
    for (let i = 1; i <= 20; i++) {
      const account: InsertZoomAccount = {
        name: `Zoom Account ${i}`,
        username: `zoom${i}@company.com`,
        password: `SecurePassword${i}!`,
        isActive: true
      };
      this.createZoomAccount(account);
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Zoom account operations
  async getZoomAccount(id: number): Promise<ZoomAccount | undefined> {
    return this.zoomAccounts.get(id);
  }
  
  async getAllZoomAccounts(): Promise<ZoomAccount[]> {
    return Array.from(this.zoomAccounts.values());
  }
  
  async createZoomAccount(account: InsertZoomAccount): Promise<ZoomAccount> {
    const id = this.zoomAccountIdCounter++;
    const zoomAccount: ZoomAccount = { ...account, id };
    this.zoomAccounts.set(id, zoomAccount);
    return zoomAccount;
  }
  
  async updateZoomAccount(id: number, updates: Partial<ZoomAccount>): Promise<ZoomAccount | undefined> {
    const account = this.zoomAccounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...updates };
    this.zoomAccounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  // Booking operations
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.bookingIdCounter++;
    const now = new Date();
    
    const booking: Booking = {
      ...insertBooking,
      id,
      zoomAccountId: null, // Will be assigned later
      status: "pending",
      createdAt: now
    };
    
    // Find available Zoom account
    const availableAccount = await this.getAvailableZoomAccount(
      booking.meetingDate,
      booking.startTime,
      booking.endTime
    );
    
    if (availableAccount) {
      booking.zoomAccountId = availableAccount.id;
      booking.status = "confirmed";
    }
    
    this.bookings.set(id, booking);
    return booking;
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }
  
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
  
  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
  
  async getAvailableZoomAccount(date: string, startTime: string, endTime: string): Promise<ZoomAccount | undefined> {
    // Get all active Zoom accounts
    const activeAccounts = Array.from(this.zoomAccounts.values()).filter(
      (account) => account.isActive
    );
    
    // Get all confirmed bookings for the given date
    const bookingsOnDate = Array.from(this.bookings.values()).filter(
      (booking) => booking.meetingDate === date && booking.status === "confirmed"
    );
    
    // Find accounts that don't have bookings in the requested time slot
    for (const account of activeAccounts) {
      const accountIsBooked = bookingsOnDate.some((booking) => {
        if (booking.zoomAccountId !== account.id) return false;
        
        // Check if there's a time conflict
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        
        // Check for time overlap
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

export const storage = new MemStorage();
