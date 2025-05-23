import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./auth";
import { z } from "zod";
import { insertBookingSchema } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";

// Schema untuk permintaan booking publik
const publicBookingSchema = z.object({
  meetingTitle: z.string().min(3, "Judul harus minimal 3 karakter"),
  meetingDate: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi"),
  participants: z.coerce.number().min(1, "Minimal 1 peserta diperlukan"),
  purpose: z.string().min(5, "Tujuan harus minimal 5 karakter"),
  kodeTiket: z.string().min(1, "Kode Tiket wajib diisi")
});

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
    
    console.log('Admin check - User:', { 
      id: req.user.id, 
      username_ldap: req.user.username_ldap, 
      role_id: req.user.role_id,
      role_id_type: typeof req.user.role_id
    });
    
    if (req.user.role_id != 1) { // Menggunakan perbandingan longgar (==) karena mungkin tipe datanya berbeda
      console.log('Access denied - role_id is not 1');
      return res.status(403).json({ message: "Akses ditolak, hak akses admin diperlukan" });
    }
    
    console.log('Admin access granted');
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
      
      // Validasi jadwal tidak boleh kurang dari waktu saat ini
      const now = new Date();
      
      // Parse tanggal dan waktu dengan benar
      const [year, month, day] = validatedData.meetingDate.split('-').map(Number);
      const [hours, minutes] = validatedData.startTime.split(':').map(Number);
      
      // Buat objek Date dengan nilai yang benar (bulan dimulai dari 0 di JavaScript)
      const meetingDateTime = new Date(year, month - 1, day, hours, minutes);
      
      // Log informasi waktu untuk debugging
      console.log('Current server time (ISO):', now.toISOString());
      console.log('Current server time (Local):', now.toString());
      console.log('Meeting time (Local):', meetingDateTime.toString());
      console.log('Meeting time (ISO):', meetingDateTime.toISOString());
      console.log('Time difference (ms):', meetingDateTime.getTime() - now.getTime());
      
      // Validasi jika waktu meeting sudah lewat dari waktu sekarang
      if (meetingDateTime.getTime() <= now.getTime()) {
        console.log('Validation failed: Meeting time is in the past');
        return res.status(400).json({ 
          success: false,
          message: `Tidak dapat membuat booking. Waktu mulai rapat (${meetingDateTime.toLocaleString()}) tidak boleh kurang dari atau sama dengan waktu saat ini (${now.toLocaleString()}).` 
        });
      }
      
      // Create the booking (will only be created if Zoom account is available)
      const { booking, zoomAccount } = await storage.createBooking(validatedData);
      
      if (!booking || !zoomAccount) {
        return res.status(400).json({ 
          success: false,
          message: "Tidak ada akun Zoom yang tersedia, silakan coba jadwal lain atau hubungi admin." 
        });
      }
      
      // Return the booking and zoom account details
      res.status(201).json({ 
        success: true,
        booking, 
        zoomAccount 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      next(error);
    }
  });
  
  // Endpoint untuk mendapatkan data pegawai berdasarkan ID
  app.get("/api/pegawai/:id", async (req, res, next) => {
    try {
      const pegawaiId = parseInt(req.params.id);
      if (isNaN(pegawaiId)) {
        return res.status(400).json({ success: false, message: "ID Pegawai tidak valid" });
      }
      
      const pegawai = await storage.getPegawaiById(pegawaiId);
      if (!pegawai) {
        return res.status(404).json({ success: false, message: "Pegawai tidak ditemukan" });
      }
      
      res.status(200).json({ success: true, pegawai });
    } catch (error) {
      next(error);
    }
  });
  
  // Endpoint untuk validasi kode tiket
  app.get("/api/validate-tiket/:kode", async (req, res, next) => {
    try {
      const kodeTiket = req.params.kode;
      if (!kodeTiket) {
        return res.status(400).json({ success: false, message: "Kode tiket tidak valid" });
      }
      
      // Periksa apakah kode tiket sudah digunakan di tabel zoom_bookings
      const [existingBooking] = await pool.query(
        `SELECT id FROM zoom_bookings WHERE kode_tiket = ?`,
        [kodeTiket]
      ) as any;
      
      if (Array.isArray(existingBooking) && existingBooking.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Kode tiket sudah digunakan. Silakan gunakan kode tiket yang lain.",
          isAlreadyUsed: true
        });
      }
      
      // Periksa kode tiket dan dapatkan data pegawai
      const [rows] = await pool.query(
        `SELECT t.*, p.nama as nama_pegawai 
         FROM tiket t 
         LEFT JOIN pegawai p ON t.pemohon_id = p.id 
         WHERE t.kode_tiket = ?`, 
        [kodeTiket]
      ) as any;
      
      const ticketData = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      const isValid = !!ticketData;
      
      res.status(200).json({ 
        success: true, 
        isValid,
        employeeName: ticketData?.nama_pegawai || null,
        isAlreadyUsed: false
      });
    } catch (error) {
      console.error('Error validating ticket code:', error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan saat validasi kode tiket" });
    }
  });
  
  // Endpoint untuk permintaan booking publik (tidak memerlukan autentikasi)
  app.post("/api/public-bookings", async (req, res, next) => {
    try {
      // Validate request body
      const validatedData = publicBookingSchema.parse(req.body);
      
      // Validasi jadwal tidak boleh kurang dari waktu saat ini
      const now = new Date();
      
      // Parse tanggal dan waktu dengan benar
      const [year, month, day] = validatedData.meetingDate.split('-').map(Number);
      const [hours, minutes] = validatedData.startTime.split(':').map(Number);
      
      // Buat objek Date dengan nilai yang benar (bulan dimulai dari 0 di JavaScript)
      const meetingDateTime = new Date(year, month - 1, day, hours, minutes);
      
      console.log('Current time:', now);
      console.log('Meeting time:', meetingDateTime);
      
      // Log informasi waktu untuk debugging
      console.log('Current server time (ISO):', now.toISOString());
      console.log('Current server time (Local):', now.toString());
      console.log('Meeting time (Local):', meetingDateTime.toString());
      console.log('Meeting time (ISO):', meetingDateTime.toISOString());
      console.log('Time difference (ms):', meetingDateTime.getTime() - now.getTime());
      
      // Validasi jika waktu meeting sudah lewat dari waktu sekarang
      if (meetingDateTime.getTime() <= now.getTime()) {
        console.log('Validation failed: Meeting time is in the past');
        return res.status(400).json({ 
          success: false,
          message: `Tidak dapat membuat booking. Waktu mulai rapat (${meetingDateTime.toLocaleString()}) tidak boleh kurang dari atau sama dengan waktu saat ini (${now.toLocaleString()}).` 
        });
      }
      
      // Periksa apakah kode tiket sudah digunakan di tabel zoom_bookings
      const [existingBooking] = await pool.query(
        `SELECT id FROM zoom_bookings WHERE kode_tiket = ?`,
        [validatedData.kodeTiket]
      ) as any;
      
      if (Array.isArray(existingBooking) && existingBooking.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Kode tiket sudah digunakan. Silakan gunakan kode tiket yang lain.",
          isAlreadyUsed: true
        });
      }
      
      // Dapatkan data tiket untuk mendapatkan pemohon_id
      const [ticketRows] = await pool.query(
        `SELECT * FROM tiket WHERE kode_tiket = ?`, 
        [validatedData.kodeTiket]
      ) as any;
      
      if (!Array.isArray(ticketRows) || ticketRows.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "Kode tiket tidak valid atau tidak ditemukan." 
        });
      }
      
      const ticketData = ticketRows[0];
      
      // Buat objek booking dengan pemohon_id sebagai userId dan kode_tiket dalam field terpisah
      const bookingData = {
        meetingTitle: validatedData.meetingTitle,
        meetingDate: validatedData.meetingDate,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        participants: validatedData.participants,
        purpose: validatedData.purpose,
        userId: ticketData.pemohon_id, // Ambil pemohon_id dari data tiket
        kode_tiket: validatedData.kodeTiket // Simpan kode_tiket di field kode_tiket
      };
      
      // Mulai transaksi database
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Create the booking
        const { booking, zoomAccount } = await storage.createBooking(bookingData);
        
        if (!booking || !zoomAccount) {
          await connection.rollback();
          return res.status(400).json({ 
            success: false,
            message: "Tidak ada akun Zoom yang tersedia, silakan coba jadwal lain atau hubungi admin." 
          });
        }
        
        // Update status tiket with WIB timezone (UTC+7)
        const now = new Date();
        // Convert to WIB (UTC+7)
        now.setHours(now.getHours() + 7);
        const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
        
        await connection.query(
          `UPDATE tiket 
           SET status = 4, 
               tanggal_status_terkini = ?,
               updated_at = ?
           WHERE kode_tiket = ?`,
          [currentTime, currentTime, validatedData.kodeTiket]
        );
        
        console.log('Updated ticket status at (WIB):', currentTime);
        
        // Get ticket ID for the chat message
        const [ticketRows] = await connection.query(
          'SELECT id FROM tiket WHERE kode_tiket = ?',
          [validatedData.kodeTiket]
        ) as any;
        
        if (Array.isArray(ticketRows) && ticketRows.length > 0) {
          const ticketId = ticketRows[0].id;
          const message = 'Yth. Bapak/Ibu\r\nBersama ini kami informasikan akun Zoom untuk menjadwalkan Virtual Meeting\r\n\r\n' +
                        'username: viconpmk7@kemenkopmk.go.id\r\n' +
                        'password: SirsaK#2025\r\n\r\n' +
                        'Mohon konfirmasi H-1 apabila akun tersebut batal digunakan.\r\n' +
                        'Kami juga mengimbau untuk perekaman Zoom Meeting disimpan di komputer lokal masing-masing ' +
                        'atau segara mengunduh hasil rekaman rapat dari Zoom Cloud.\r\n\r\n' +
                        'Demikian disampaikan, terima kasih.\r\n';
          
          // Insert new chat message
          await connection.query(
            `INSERT INTO tiket_chat 
             (tiket_id, pengirim_id, jenis_pengirim, isi, lampiran, is_read, created_at, updated_at, lampiran_mime, lampiran_nama)
             VALUES (?, 15, 'system', ?, NULL, 0, NOW(), NULL, NULL, NULL)`,
            [ticketId, message]
          );
          
          console.log('Added chat message for ticket ID:', ticketId);
        } else {
          console.error('Ticket not found for kode_tiket:', validatedData.kodeTiket);
        }
        
        // Commit transaksi jika semua berhasil
        await connection.commit();
        
        // Return the booking and zoom account details
        res.status(201).json({ 
          success: true,
          booking, 
          zoomAccount 
        });
        
      } catch (error) {
        // Rollback transaksi jika terjadi error
        await connection.rollback();
        console.error('Error during booking:', error);
        next(error);
      } finally {
        // Selalu lepaskan koneksi
        await connection.release();
      }
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
      if (booking.userId !== req.user.id && req.user.role_id !== 1) {
        return res.status(403).json({ message: "You are not authorized to view this booking" });
      }
      
      // Enhance booking with Zoom account details if assigned
      let enhancedBooking = { ...booking, zoomAccount: null };
      if (booking.zoomAccountId) {
        const zoomAccount = await storage.getZoomAccount(booking.zoomAccountId);
        enhancedBooking.zoomAccount = zoomAccount || null;
      }
      
      res.json(enhancedBooking);
    } catch (error) {
      next(error);
    }
  });
  
  // Get all bookings (admin only)
  app.get("/api/admin/bookings", authenticateAdmin, async (req, res, next) => {
    try {
      await markCompletedBookings();
      const allBookings = await storage.getAllBookings();
      
      // Enhance bookings with Zoom account details if assigned
      const enhancedBookings = await Promise.all(
        allBookings.map(async (booking) => {
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
  
  // Create a new HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}

// Function to mark bookings as completed if they are in the past
async function markCompletedBookings() {
  try {
    const now = new Date();
    const allBookings = await storage.getAllBookings();
    
    for (const booking of allBookings) {
      if (booking.status === 'active') {
        const bookingEndDateTime = new Date(`${booking.meetingDate} ${booking.endTime}`);
        
        if (bookingEndDateTime < now) {
          await storage.updateBooking(booking.id, { status: 'completed' });
        }
      }
    }
  } catch (error) {
    console.error('Error marking completed bookings:', error);
  }
}
