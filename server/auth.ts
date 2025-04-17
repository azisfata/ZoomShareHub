import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { pool } from "./db";
import { Server as SocketIOServer } from 'socket.io';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Fungsi untuk hapus session lama user (tidak perlu kirim event di sini)
async function deleteSessionsForUser(userId: number) {
  await pool.query(`
    DELETE FROM "session"
    WHERE (sess->'passport'->>'user')::int = $1
  `, [userId]);
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
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
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
      const { rows } = await pool.query(`
        SELECT sid FROM "session"
        WHERE (sess->'passport'->>'user')::int = $1
      `, [user.id]);
      const oldSessionIds = rows.map((row: any) => row.sid);

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
