import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./auth";
import { z } from "zod";
import { insertBookingSchema, User, ZoomAccount, Booking } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      id: number;
      username_ldap: string;
      role_id: number;
      name?: string;
      department?: string;
    }
  }
}

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
    console.log(`[AUTH_ADMIN] Attempting admin authentication for path: ${req.path}`);
    if (!req.isAuthenticated() || !req.user) {
      console.log('[AUTH_ADMIN] User not authenticated or req.user is missing.');
      return res.status(401).json({ message: "Unauthorized: Authentication required." });
    }

    console.log(`[AUTH_ADMIN] User authenticated: ${req.user.username_ldap}, Role ID: ${req.user.role_id}`);

    // IMPORTANT: Confirm '1' is the correct admin role_id from your database schema.
    // If your admin role_id is different, update this check.
    if (req.user.role_id !== 1) {
      console.log(`[AUTH_ADMIN] Forbidden: User ${req.user.username_ldap} with role_id ${req.user.role_id} is not an admin.`);
      return res.status(403).json({ message: "Forbidden: Insufficient privileges." });
    }

    console.log(`[AUTH_ADMIN] Access GRANTED for admin user ${req.user.username_ldap} to path: ${req.path}`);
    next();
  };

  // API routes for Zoom account management

  // Get all Zoom accounts with their status
  app.get("/api/admin/accounts", authenticateAdmin, async (req, res, next) => {
    console.log(`[ROUTE_HANDLER] Entered GET /api/admin/accounts for user: ${req.user?.username_ldap}`); // New Entry Log
    try {
      const accounts = await storage.getAllZoomAccounts();
      console.log('[ROUTE_HANDLER] GET /api/admin/accounts - Fetched accounts count:', accounts.length);
      if (accounts.length > 0) {
        console.log('[ROUTE_HANDLER] GET /api/admin/accounts - First account (sample):', JSON.stringify(accounts[0], null, 2)); // Stringify for better object logging
      }
      res.json(accounts);
    } catch (error) {
      console.error('[ROUTE_HANDLER_ERROR] GET /api/admin/accounts - Error:', error);
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

  // Admin stats endpoint
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      const [
        totalBookings,
        totalUsers,
        zoomAccounts,
        bookings,
        users
      ] = await Promise.all([
        storage.getTotalBookings(),
        storage.getTotalUsers(),
        storage.getAllZoomAccounts(),
        storage.getLatestBookings(10), // Get last 10 bookings
        storage.getAllUsers()
      ]) as [number, number, ZoomAccount[], Booking[], User[]];

      const activeZoomAccounts = zoomAccounts.filter((acc: ZoomAccount) => acc.isActive).length;
      const inactiveZoomAccounts = zoomAccounts.filter((acc: ZoomAccount) => !acc.isActive).length;
      const pendingBookings = bookings.filter((b: Booking) => b.status === 'pending').length;
      const completedBookings = bookings.filter((b: Booking) => b.status === 'completed').length;

      res.json({
        totalBookings,
        totalUsers,
        activeZoomAccounts,
        inactiveZoomAccounts,
        pendingBookings,
        completedBookings,
        accountsWithStatus: zoomAccounts.map((acc: ZoomAccount) => ({
          id: acc.id,
          name: acc.name,
          username: acc.username,
          isActive: acc.isActive
        })),
        latestBookings: bookings.map((booking: Booking) => ({
          id: booking.id,
          meetingTitle: booking.meetingTitle,
          meetingDate: booking.meetingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          zoomAccount: booking.zoomAccountId ? {
            name: zoomAccounts.find((a: ZoomAccount) => a.id === booking.zoomAccountId)?.name || 'Unknown'
          } : undefined
        })),
        users: users.map((user: User) => ({
          id: user.id,
          name: user.name || '',
          username: user.username_ldap,
          department: user.department || '',
          role_id: user.role_id
        }))
      });
    } catch (error) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({ message: 'Failed to get admin stats' });
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
    const connection = await pool.getConnection();
    try {
      const kodeTiket = req.params.kode;
      console.log('Validating ticket code:', kodeTiket); // Log untuk debugging

      if (!kodeTiket || kodeTiket.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Kode tiket tidak valid",
          isValid: false
        });
      }

      // Periksa apakah kode tiket ada di database
      const [ticketRows] = await connection.query(
        `SELECT t.*, p.nama as nama_pegawai 
         FROM tiket t 
         LEFT JOIN pegawai p ON t.pemohon_id = p.id 
         WHERE t.kode_tiket = ?`,
        [kodeTiket]
      ) as any;

      if (!Array.isArray(ticketRows) || ticketRows.length === 0) {
        console.log('Kode tiket tidak ditemukan:', kodeTiket); // Log untuk debugging
        return res.status(200).json({
          success: true,
          isValid: false,
          message: "Kode tiket tidak terdaftar"
        });
      }

      const ticketData = ticketRows[0];

      // Tambahkan validasi id_layanan
      if (ticketData.id_layanan !== 1) {
        console.log('Kode tiket tidak valid: id_layanan bukan 1');
        return res.status(200).json({
          success: true,
          isValid: false,
          message: "Kode tiket tidak valid untuk layanan ini."
        });
      }

      // Periksa apakah kode tiket sudah digunakan di tabel zoom_bookings
      const [existingBooking] = await connection.query(
        `SELECT id FROM zoom_bookings WHERE kode_tiket = ?`,
        [kodeTiket]
      ) as any;

      const isAlreadyUsed = Array.isArray(existingBooking) && existingBooking.length > 0;

      if (isAlreadyUsed) {
        console.log('Kode tiket sudah digunakan:', kodeTiket); // Log untuk debugging
        return res.status(200).json({
          success: true,
          isValid: false,
          isAlreadyUsed: true,
          message: "Kode tiket sudah digunakan. Silakan gunakan kode tiket yang lain."
        });
      }

      // Jika sampai sini, berarti kode tiket valid dan belum digunakan
      console.log('Kode tiket valid:', kodeTiket); // Log untuk debugging
      res.status(200).json({
        success: true,
        isValid: true,
        isAlreadyUsed: false,
        employeeName: ticketData.nama_pegawai || null,
        message: "Kode tiket valid"
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

      // Tambahkan validasi id_layanan
      if (ticketData.id_layanan !== 1) {
        return res.status(400).json({
          success: false,
          message: "Kode tiket tidak valid untuk layanan ini."
        });
      }

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

        if (!booking) {
          await connection.rollback();
          return res.status(500).json({
            success: false,
            message: "Gagal membuat booking. Silakan coba lagi nanti."
          });
        }

        // Check if booking is pending (no Zoom account available)
        if (booking.status === 'pending') {
          // Update ticket status to indicate pending Zoom account
          const now = new Date();
          now.setHours(now.getHours() + 7); // Convert to WIB (UTC+7)
          const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');

          await connection.query(
            `UPDATE tiket 
             SET status = 5,  // Status 5 untuk menandakan menunggu akun Zoom
                 id_pj = 0,
                 tanggal_status_terkini = ?,
                 updated_at = ?
             WHERE kode_tiket = ?`,
            [currentTime, currentTime, validatedData.kodeTiket]
          );

          console.log('Created pending booking with ID:', booking.id);
          
          await connection.commit();
          return res.status(202).json({
            success: true,
            message: "Booking berhasil dibuat dan sedang menunggu ketersediaan akun Zoom. Anda akan diberitahu begitu akun tersedia.",
            data: {
              bookingId: booking.id,
              status: 'pending',
              meetingTitle: booking.meetingTitle,
              meetingDate: booking.meetingDate,
              startTime: booking.startTime,
              endTime: booking.endTime
            }
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

          // Get Zoom account details for this booking
          const [zoomAccountRows] = await connection.query(
            `SELECT za.username, za.password 
             FROM zoom_bookings zb
             JOIN zoom_accounts za ON zb.zoom_account_id = za.id
             WHERE zb.kode_tiket = ?`,
            [validatedData.kodeTiket]
          ) as any;

          if (!Array.isArray(zoomAccountRows) || zoomAccountRows.length === 0) {
            throw new Error('Zoom account not found for this booking');
          }

          const zoomAccount = zoomAccountRows[0];

          const message = 'Kami informasikan bahwa akun Zoom Meeting yang Anda minta telah tersedia. ' +
            'Anda dapat melihat informasi akun pada bagian Informasi <b>Akun Zoom Meeting</b> di bawah <b>Detail Permohonan</b> pada halaman ini.\r\n\r\n' +
            'Mohon melakukan konfirmasi pada H-1 melalui pesan Whatsapp ke nomor 085169673396 ' +
            'apabila akun tersebut batal digunakan. Kami juga mengimbau untuk perekaman Zoom Meeting ' +
            'disimpan di komputer lokal masing-masing atau segara mengunduh hasil rekaman rapat dari Zoom Cloud.\r\n\r\n' +
            'Demikian disampaikan, terima kasih.\r\n\r\n' +
            '--\r\n' +
            '<b>Biro Digitalisasi dan Pengelolaan Informasi</b>\r\n';

          // Insert new chat message
          await connection.query(
            `INSERT INTO tiket_chat 
             (tiket_id, pengirim_id, jenis_pengirim, isi, lampiran, is_read, created_at, updated_at, lampiran_mime, lampiran_nama)
             VALUES (?, 15, 'system', ?, NULL, 0, NOW(), NULL, NULL, NULL)`,
            [ticketId, message]
          );

          // Get user's name based on ticket
          const [userData] = await connection.query(
            `SELECT p.nama FROM tiket t 
             JOIN pegawai p ON t.pemohon_id = p.id 
             WHERE t.kode_tiket = ?`,
            [validatedData.kodeTiket]
          ) as any;
          
          const userName = userData[0]?.nama || 'Bapak/Ibu';
          const ticketNumber = validatedData.kodeTiket;
          
          const message2 = `Hai ${userName}, tiket ${ticketNumber} Anda telah berhasil kami selesaikan dan telah ditutup. Kami mohon kesediaan Anda untuk memberikan penilaian terhadap layanan kami di bagian <b>Beri Penilaian</b>. Terima kasih atas kepercayaan Anda.`;

          // Insert new chat message
          await connection.query(
            `INSERT INTO tiket_chat 
             (tiket_id, pengirim_id, jenis_pengirim, isi, lampiran, is_read, created_at, updated_at, lampiran_mime, lampiran_nama)
             VALUES (?, 15, 'system', ?, NULL, 0, NOW(), NULL, NULL, NULL)`,
            [ticketId, message2]
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
      let enhancedBooking = { ...booking, zoomAccount: null as ZoomAccount | null };
      if (booking.zoomAccountId) {
        const zoomAccount = await storage.getZoomAccount(booking.zoomAccountId);
        if (zoomAccount) {
          enhancedBooking.zoomAccount = zoomAccount;
        }
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
