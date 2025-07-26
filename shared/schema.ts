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

// Admin users schema for access management
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // "admin", "volunteer", "data_viewer"
  region: text("region"), // for multi-location churches
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportConfigs = pgTable("report_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // "weekly", "monthly", "on-demand"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportRuns = pgTable("report_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportConfigId: varchar("report_config_id").notNull().references(() => reportConfigs.id),
  runById: varchar("run_by_id").notNull().references(() => adminUsers.id),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  parameters: text("parameters"), // JSON string
  filePath: text("file_path"), // for exported files
});

// Relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  reportRuns: many(reportRuns),
}));

export const reportConfigsRelations = relations(reportConfigs, ({ many }) => ({
  reportRuns: many(reportRuns),
}));

export const reportRunsRelations = relations(reportRuns, ({ one }) => ({
  reportConfig: one(reportConfigs, {
    fields: [reportRuns.reportConfigId],
    references: [reportConfigs.id],
  }),
  runBy: one(adminUsers, {
    fields: [reportRuns.runById],
    references: [adminUsers.id],
  }),
}));

// Insert schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "volunteer", "data_viewer"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertReportConfigSchema = createInsertSchema(reportConfigs).omit({
  id: true,
  createdAt: true,
});

export const insertReportRunSchema = createInsertSchema(reportRuns).omit({
  id: true,
  generatedAt: true,
});

// Types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type ReportConfig = typeof reportConfigs.$inferSelect;
export type InsertReportConfig = z.infer<typeof insertReportConfigSchema>;
export type ReportRun = typeof reportRuns.$inferSelect;
export type InsertReportRun = z.infer<typeof insertReportRunSchema>;

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
