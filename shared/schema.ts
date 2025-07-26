import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  group: text("group").notNull(), // "male", "female", "child", "adolescent"
  phone: text("phone").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  isCurrentMember: boolean("is_current_member").notNull().default(true),
  fingerprintId: text("fingerprint_id"), // Simulated fingerprint identifier
  parentId: varchar("parent_id"), // For family linking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  attendanceDate: date("attendance_date").notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  checkInMethod: text("check_in_method").notNull(), // "fingerprint", "manual", "family"
  isGuest: boolean("is_guest").default(false),
});

export const followUpRecords = pgTable("follow_up_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  lastContactDate: timestamp("last_contact_date"),
  contactMethod: text("contact_method"), // "sms", "email"
  consecutiveAbsences: integer("consecutive_absences").default(0),
  needsFollowUp: boolean("needs_follow_up").default(false),
});

// Relations
export const membersRelations = relations(members, ({ many, one }) => ({
  attendanceRecords: many(attendanceRecords),
  followUpRecord: one(followUpRecords, {
    fields: [members.id],
    references: [followUpRecords.memberId],
  }),
  children: many(members, { relationName: "family" }),
  parent: one(members, {
    fields: [members.parentId],
    references: [members.id],
    relationName: "family",
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  member: one(members, {
    fields: [attendanceRecords.memberId],
    references: [members.id],
  }),
}));

export const followUpRecordsRelations = relations(followUpRecords, ({ one }) => ({
  member: one(members, {
    fields: [followUpRecords.memberId],
    references: [members.id],
  }),
}));

// Insert schemas
export const insertMemberSchema = createInsertSchema(members, {
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format"),
  dateOfBirth: z.string().refine((date) => new Date(date) < new Date(), "Date of birth must be in the past"),
  group: z.enum(["male", "female", "child", "adolescent"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords, {
  attendanceDate: z.string(),
  checkInMethod: z.enum(["fingerprint", "manual", "family"]),
}).omit({
  id: true,
  checkInTime: true,
});

export const insertFollowUpRecordSchema = createInsertSchema(followUpRecords).omit({
  id: true,
});

// Types
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type FollowUpRecord = typeof followUpRecords.$inferSelect;
export type InsertFollowUpRecord = z.infer<typeof insertFollowUpRecordSchema>;

// Legacy user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
