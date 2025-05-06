import { mysqlTable, text, int, boolean, timestamp, primaryKey, varchar, datetime } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// User schema
export const users = mysqlTable("zoom_users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  department: true,
  email: true,
  role: true,
});

// Zoom accounts schema
export const zoomAccounts = mysqlTable("zoom_accounts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertZoomAccountSchema = createInsertSchema(zoomAccounts).pick({
  name: true,
  username: true,
  password: true,
  isActive: true,
});

// Bookings schema
export const bookings = mysqlTable("zoom_bookings", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  zoomAccountId: int("zoom_account_id"),
  meetingTitle: varchar("meeting_title", { length: 255 }).notNull(),
  meetingDate: varchar("meeting_date", { length: 50 }).notNull(),
  startTime: varchar("start_time", { length: 50 }).notNull(),
  endTime: varchar("end_time", { length: 50 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  participants: int("participants").notNull(),
  purpose: varchar("purpose", { length: 255 }).notNull(),
  needsRecording: boolean("needs_recording").default(false),
  needsBreakoutRooms: boolean("needs_breakout_rooms").default(false),
  needsPolls: boolean("needs_polls").default(false),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  zoomAccountId: true,
  status: true,
  createdAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const zoomAccountsRelations = relations(zoomAccounts, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  zoomAccount: one(zoomAccounts, {
    fields: [bookings.zoomAccountId],
    references: [zoomAccounts.id],
  }),
}));

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertZoomAccount = z.infer<typeof insertZoomAccountSchema>;
export type ZoomAccount = typeof zoomAccounts.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
