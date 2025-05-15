import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { pool } from "./db";
import { Server as SocketIOServer } from 'socket.io';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export async function hashPassword(password: string) {
  // Generate hash using bcryptjs
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePasswords(supplied: string, stored: string) {
  // Compare password with bcryptjs
  return bcrypt.compare(supplied, stored);
}

// Fungsi untuk hapus session lama user (tidak perlu kirim event di sini)
// Disabled: Allow multiple concurrent sessions per user. This function is now a no-op.
async function deleteSessionsForUser(userId: number) {
  // This function intentionally left blank to allow multiple logins from the same user account.
  // Previously, this deleted all sessions for the user to enforce single session login.
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "zoom-account-manager-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt for username:', username);
        const user = await storage.getUserByLdapUsername(username);
        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "User not found" });
        }
        console.log('Found user:', { id: user.id, username_ldap: user.username_ldap });
        
        console.log('Stored password hash:', user.password);
        console.log('Comparing with supplied password:', password);
        const isValid = await comparePasswords(password, user.password);
        console.log('Password comparison result:', isValid);
        
        if (!isValid) {
          console.log('Invalid password');
          return done(null, false, { message: "Invalid password" });
        }

        // Ambil user lengkap (dengan nama dan department dari pegawai/unit_kerja)
        const fullUser = await storage.getUser(user.id);
        if (!fullUser) {
          console.log('Full user data not found');
          return done(null, false, { message: "User data not found" });
        }
        
        console.log('Full user data:', { id: fullUser.id, username_ldap: fullUser.username_ldap, role_id: fullUser.role_id });
        return done(null, fullUser);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // Jika user tidak ditemukan, hapus session
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByLdapUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove the password from the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      // Ambil io dari app
      const io = req.app.get('io');
      // Ambil semua session lama user
      const [results] = await pool.query(`
        SELECT sid FROM zoom_sessions
        WHERE JSON_EXTRACT(sess, '$.passport.user') = ?
      `, [user.id]);
      const oldSessionIds = Array.isArray(results) ? results.map((row: any) => row.sid) : [];

      // Hapus semua session lama
      await deleteSessionsForUser(user.id);

      // Kirim force_logout ke semua session lama
      if (io) {
        // Broadcast ke semua socket dalam room user
        io.to(`user:${user.id}`).emit('force_logout', {
          message: 'Anda telah login di perangkat lain. Sesi ini akan berakhir.',
          sessionId: null
        });
        
        // Juga kirim ke semua session lama secara spesifik
        for (const sid of oldSessionIds) {
          io.to(`session:${sid}`).emit('force_logout', {
            message: 'Anda telah login di perangkat lain. Sesi ini akan berakhir.',
            sessionId: sid
          });
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        // Log data user yang akan dikirim ke client
        console.log('Sending user data to client:', {
          ...userWithoutPassword,
          sessionId: req.sessionID
        });
        // Kirim sessionId baru ke client
        res.status(200).json({ ...userWithoutPassword, sessionId: req.sessionID });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove the password from the response
    const { password, ...userWithoutPassword } = req.user;
    
    // Log data user yang akan dikirim ke client
    console.log('GET /api/user response:', userWithoutPassword);
    
    res.json(userWithoutPassword);
  });
}

// Socket.io: join room berdasarkan sessionId
function setupSocketIo(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Client harus mengirim sessionId setelah login
    socket.on('join_session', (sessionId) => {
      if (sessionId) {
        console.log(`Socket ${socket.id} joining session room: ${sessionId}`);
        socket.join(`session:${sessionId}`);
      }
    });
    
    // Authenticate user
    socket.on('authenticate', (userId) => {
      if (userId) {
        console.log(`Socket ${socket.id} authenticated for user: ${userId}`);
        socket.join(`user:${userId}`);
      }
    });
  });
}

export { setupSocketIo };
