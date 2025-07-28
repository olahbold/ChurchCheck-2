import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"), // Mr, Mrs, Dr, Pastor, etc.
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  gender: text("gender").notNull(), // "male", "female"
  ageGroup: text("age_group").notNull(), // "child", "adolescent", "adult"
  phone: text("phone").notNull(),
  email: text("email"),
  whatsappNumber: text("whatsapp_number"),
  address: text("address"),
  dateOfBirth: date("date_of_birth").notNull(),
  weddingAnniversary: date("wedding_anniversary"),
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

// First-time visitors table for detailed visitor information
export const visitors = pgTable("visitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").references(() => members.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: varchar("gender", { length: 10 }), // male, female
  ageGroup: varchar("age_group", { length: 15 }), // child, adolescent, adult
  address: text("address"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  weddingAnniversary: date("wedding_anniversary"),
  birthday: date("birthday"),
  prayerPoints: text("prayer_points"),
  howDidYouHearAboutUs: text("how_did_you_hear_about_us"),
  comments: text("comments"),
  visitDate: timestamp("visit_date").defaultNow(),
  followUpStatus: varchar("follow_up_status", { length: 50 }).default("pending"), // pending, contacted, member
  assignedTo: varchar("assigned_to", { length: 255 }), // Pastor/volunteer assigned for follow-up
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const visitorsRelations = relations(visitors, ({ one }) => ({
  member: one(members, {
    fields: [visitors.memberId],
    references: [members.id],
  }),
}));

// Insert schemas - using transform with refined validation
export const insertMemberSchema = createInsertSchema(members, {
  title: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid WhatsApp number format").optional().or(z.literal("")),
  dateOfBirth: z.string().refine((date) => new Date(date) < new Date(), "Date of birth must be in the past"),
  weddingAnniversary: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  ageGroup: z.enum(["child", "adolescent", "adult"]),
  address: z.string().optional().or(z.literal("")),
  fingerprintId: z.string().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).superRefine((data, ctx) => {
  // Phone validation based on age group
  if (data.ageGroup === "adult" && (!data.phone || data.phone.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phone number is required for adults",
      path: ["phone"]
    });
  }
  
  // Phone format validation if provided
  if (data.phone && data.phone.trim() !== "" && !/^\+?[\d\s\-\(\)]+$/.test(data.phone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid phone number format",
      path: ["phone"]
    });
  }
});

// Update schema with more lenient validation for partial updates
export const updateMemberSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().optional(),
  surname: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  ageGroup: z.enum(["child", "adolescent", "adult"]).optional(),
  phone: z.string().optional().refine((val) => {
    // If provided, must be valid format
    if (val && val.trim() !== "" && !/^\+?[\d\s\-\(\)]+$/.test(val)) {
      return false;
    }
    return true;
  }, "Invalid phone number format"),
  email: z.string().email("Invalid email format").optional(),
  whatsappNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid WhatsApp number format").optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().refine((date) => !date || new Date(date) < new Date(), "Date of birth must be in the past").optional(),
  weddingAnniversary: z.string().optional(),
  isCurrentMember: z.boolean().optional(),
  fingerprintId: z.string().optional(),
  parentId: z.string().optional(),
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

export const insertVisitorSchema = createInsertSchema(visitors, {
  gender: z.enum(["male", "female"]).optional(),
  ageGroup: z.enum(["child", "adolescent", "adult"]).optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format").optional().or(z.literal("")),
  whatsappNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid WhatsApp number format").optional().or(z.literal("")),
  weddingAnniversary: z.string().optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  followUpStatus: z.enum(["pending", "contacted", "member"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  visitDate: true,
});

// Types
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type UpdateMember = z.infer<typeof updateMemberSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type FollowUpRecord = typeof followUpRecords.$inferSelect;
export type InsertFollowUpRecord = z.infer<typeof insertFollowUpRecordSchema>;
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;

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
