import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  email: text("email").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  department: true,
  email: true,
});

// Zoom accounts schema
export const zoomAccounts = pgTable("zoom_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertZoomAccountSchema = createInsertSchema(zoomAccounts).pick({
  name: true,
  username: true,
  password: true,
  isActive: true,
});

// Bookings schema
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  zoomAccountId: integer("zoom_account_id"),
  meetingTitle: text("meeting_title").notNull(),
  meetingDate: text("meeting_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  department: text("department").notNull(),
  participants: integer("participants").notNull(),
  purpose: text("purpose").notNull(),
  needsRecording: boolean("needs_recording").default(false),
  needsBreakoutRooms: boolean("needs_breakout_rooms").default(false),
  needsPolls: boolean("needs_polls").default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  zoomAccountId: true,
  status: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertZoomAccount = z.infer<typeof insertZoomAccountSchema>;
export type ZoomAccount = typeof zoomAccounts.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
