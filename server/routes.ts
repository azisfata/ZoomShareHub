import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./auth";
import { z } from "zod";
import { insertBookingSchema } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Authentication middleware
  const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  
  // Admin middleware
  const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Akses ditolak, hak akses admin diperlukan" });
    }
    
    next();
  };

  // API routes for Zoom account management
  
  // Get all Zoom accounts with their status
  app.get("/api/zoom-accounts", authenticateUser, async (req, res, next) => {
    try {
      const accounts = await storage.getAllZoomAccounts();
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific Zoom account
  app.get("/api/zoom-accounts/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const account = await storage.getZoomAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Zoom account not found" });
      }
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  });
  
  // Bookings routes
  
  // Create a new booking
  app.post("/api/bookings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      
      // Get the user data
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      // Validate request body
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.id,
        // User ID sudah ditambahkan di atas
      });
      
      // Create the booking
      const booking = await storage.createBooking(validatedData);
      
      // If booking was confirmed with a Zoom account, return the account details
      if (booking.status === "confirmed" && booking.zoomAccountId) {
        const zoomAccount = await storage.getZoomAccount(booking.zoomAccountId);
        return res.status(201).json({ booking, zoomAccount });
      }
      
      // Otherwise just return the booking
      res.status(201).json({ booking, zoomAccount: null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      next(error);
    }
  });
  
  // Get all bookings for the current user
  app.get("/api/bookings", async (req, res, next) => {
    try {
      await markCompletedBookings();
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const userBookings = await storage.getBookingsByUserId(req.user.id);
      
      // Enhance bookings with Zoom account details if assigned
      const enhancedBookings = await Promise.all(
        userBookings.map(async (booking) => {
          if (booking.zoomAccountId) {
            const zoomAccount = await storage.getZoomAccount(booking.zoomAccountId);
            return { 
              ...booking, 
              zoomAccount: zoomAccount || null 
            };
          }
          return { ...booking, zoomAccount: null };
        })
      );
      
      res.json(enhancedBookings);
    } catch (error) {
      next(error);
    }
  });
  
  // Get a specific booking
  app.get("/api/bookings/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow users to view their own bookings
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Include Zoom account details if assigned
      let zoomAccount = null;
      if (booking.zoomAccountId) {
        zoomAccount = await storage.getZoomAccount(booking.zoomAccountId);
      }
      
      res.json({ booking, zoomAccount });
    } catch (error) {
      next(error);
    }
  });
  
  // Cancel a booking
  app.delete("/api/bookings/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow users to cancel their own bookings
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Update booking status to cancelled
      const updatedBooking = await storage.updateBooking(id, { status: "cancelled" });
      
      res.json(updatedBooking);
    } catch (error) {
      next(error);
    }
  });
  
  // Admin routes
  
  // Get admin dashboard stats
  app.get("/api/admin/stats", authenticateAdmin, async (req, res, next) => {
    try {
      await markCompletedBookings();
      const allUsers = await storage.getAllUsers();
      const allZoomAccounts = await storage.getAllZoomAccounts();
      const allBookings = await storage.getAllBookings();
      
      const activeZoomAccounts = allZoomAccounts.filter(acc => acc.isActive);
      const inactiveZoomAccounts = allZoomAccounts.filter(acc => !acc.isActive);
      const pendingBookings = allBookings.filter(booking => booking.status === "pending");
      const completedBookings = allBookings.filter(booking => booking.status === "completed");
      
      // Get accounts with their status
      const accountsWithStatus = allZoomAccounts.map(account => ({
        id: account.id,
        name: account.name,
        username: account.username,
        isActive: account.isActive
      }));

      // Get latest bookings with zoom account info
      const latestBookings = await Promise.all(
        allBookings.slice(0, 5).map(async (booking) => ({
          id: booking.id,
          meetingTitle: booking.meetingTitle,
          meetingDate: booking.meetingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          zoomAccount: booking.zoomAccountId 
            ? await storage.getZoomAccount(booking.zoomAccountId)
            : undefined
        }))
      );

      // Get users with department and role
      const users = allUsers.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        department: user.department,
        role: user.role
      }));

      res.json({
        totalBookings: allBookings.length,
        totalUsers: allUsers.length,
        activeZoomAccounts: activeZoomAccounts.length,
        inactiveZoomAccounts: inactiveZoomAccounts.length,
        pendingBookings: pendingBookings.length,
        completedBookings: completedBookings.length,
        accountsWithStatus,
        latestBookings,
        users
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Create new user (admin only)
  app.post("/api/admin/users", authenticateAdmin, async (req, res, next) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);
      // Hash password sebelum simpan
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });
  
  // Hapus user (admin only)
  app.delete("/api/admin/users/:id", authenticateAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID tidak valid" });
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // User dashboard stats
  app.get("/api/dashboard", authenticateUser, async (req, res, next) => {
    try {
      const allAccounts = await storage.getAllZoomAccounts();
      const allBookings = await storage.getAllBookings();
      const userBookings = await storage.getBookingsByUserId(req.user.id);
      
      // Get currently active bookings (assuming they are for today)
      const today = new Date().toISOString().split('T')[0];
      const activeBookings = allBookings.filter(booking => 
        booking.status === "confirmed" && booking.meetingDate === today
      );
      
      // Get accounts with status (calculate if they are currently booked)
      const accountsWithStatus = await Promise.all(
        allAccounts.map(async (account) => {
          const isBooked = activeBookings.some(booking => booking.zoomAccountId === account.id);
          return {
            ...account,
            currentStatus: isBooked ? "in-use" : "available"
          };
        })
      );
      
      // Calculate available accounts count
      const availableAccountsCount = accountsWithStatus.filter(
        account => account.currentStatus === "available" && account.isActive
      ).length;
      
      // Calculate currently booked accounts count
      const bookedAccountsCount = accountsWithStatus.filter(
        account => account.currentStatus === "in-use"
      ).length;
      
      // Calculate user's active bookings count
      const userActiveBookingsCount = userBookings.filter(
        booking => booking.status === "confirmed" && booking.meetingDate >= today
      ).length;
      
      const stats = {
        availableAccountsCount,
        bookedAccountsCount,
        userActiveBookingsCount,
        accountsWithStatus,
      };
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function markCompletedBookings() {
  // Implementasi fungsi markCompletedBookings
  // Contoh:
  const allBookings = await storage.getAllBookings();
  const today = new Date().toISOString().split('T')[0];
  const completedBookings = allBookings.filter(booking => 
    booking.status === "confirmed" && booking.meetingDate < today
  );
  await Promise.all(
    completedBookings.map(async (booking) => {
      await storage.updateBooking(booking.id, { status: "completed" });
    })
  );
}
