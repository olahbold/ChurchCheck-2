import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, date ,serial} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Multi-tenant Churches table
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: varchar("subdomain", { length: 50 }).unique(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  brandColor: varchar("brand_color", { length: 7 }).default("#6366f1"), // Hex color
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("trial"), // trial, starter, growth, enterprise
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date").default(sql`NOW() + INTERVAL '30 days'`),
  subscriptionStartDate: timestamp("subscription_start_date"),
  maxMembers: integer("max_members").default(100), // Based on subscription tier
  kioskSessionTimeout: integer("kiosk_session_timeout").default(60), // minutes
  kioskModeEnabled: boolean("kiosk_mode_enabled").default(false),
  kioskSessionStartTime: timestamp("kiosk_session_start_time"), // When kiosk session started
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});






// Church users/admins for authentication
export const churchUsers = pgTable("church_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"), // admin, volunteer, data_viewer
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Super Admin table for platform management
export const superAdmins = pgTable("super_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("super_admin"), // super_admin, support_admin
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communication Providers for flexible SMS/Email configuration
export const communicationProviders = pgTable("communication_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  providerType: varchar("provider_type", { length: 10 }).notNull(), // 'sms' or 'email'
  providerName: varchar("provider_name", { length: 30 }).notNull(), // 'twilio', 'sendgrid', 'aws_sns', 'mailgun', etc.
  displayName: text("display_name").notNull(), // User-friendly name
  credentials: text("credentials").notNull(), // Encrypted JSON with provider-specific credentials
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false), // Primary provider for this type
  testStatus: varchar("test_status", { length: 20 }).default("untested"), // 'connected', 'failed', 'untested'
  testMessage: text("test_message"), // Error message from last test
  lastTestedAt: timestamp("last_tested_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Message delivery tracking
export const messageDeliveries = pgTable("message_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => communicationProviders.id),
  messageType: varchar("message_type", { length: 20 }).notNull(), // 'birthday', 'followup', 'event', 'bulk'
  recipientType: varchar("recipient_type", { length: 10 }).notNull(), // 'member' or 'visitor'
  recipientId: varchar("recipient_id"), // member or visitor ID
  recipientContact: text("recipient_contact").notNull(), // email or phone number
  subject: text("subject"), // For emails
  messageContent: text("message_content").notNull(),
  deliveryStatus: varchar("delivery_status", { length: 20 }).default("pending"), // 'sent', 'delivered', 'failed', 'pending'
  providerMessageId: text("provider_message_id"), // External provider's message ID
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription tracking
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  status: varchar("status", { length: 20 }).notNull(), // active, canceled, past_due, etc.
  planId: varchar("plan_id", { length: 50 }).notNull(), // starter, growth, enterprise
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  title: text("title"), // Mr, Mrs, Dr, Pastor, etc.
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  gender: text("gender").notNull(), // "male", "female"
  ageGroup: text("age_group").notNull(), // "child", "adolescent", "adult"
  phone: text("phone"), // Optional for children/adolescents
  email: text("email"),
  whatsappNumber: text("whatsapp_number"),
  address: text("address"),
  dateOfBirth: varchar("date_of_birth", { length: 10 }), // Optional
  weddingAnniversary: varchar("wedding_anniversary", { length: 10 }),
  isCurrentMember: boolean("is_current_member").notNull().default(true),
  fingerprintId: text("fingerprint_id"), // Simulated fingerprint identifier
  parentId: varchar("parent_id"), // Legacy field - for backward compatibility
  // New family structure fields
  familyGroupId: varchar("family_group_id"), // Links all family members
  relationshipToHead: varchar("relationship_to_head", { length: 20 }).default("head"), // "head", "spouse", "child", "parent", "sibling", "other"
  isFamilyHead: boolean("is_family_head").default(true), // Quick identifier for family head
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("sunday_service"), // sunday_service, prayer_meeting, bible_study, youth_group, special_event, other
  organizer: text("organizer"),
  location: text("location"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // weekly, monthly, etc.
  startDate: varchar("start_date", { length: 10 }),
  endDate: varchar("end_date", { length: 10 }),
  startTime: text("start_time"), // HH:MM format
  endTime: text("end_time"), // HH:MM format
  maxAttendees: integer("max_attendees"),
  isActive: boolean("is_active").default(true),
  // External check-in system fields
  externalCheckInEnabled: boolean("external_check_in_enabled").default(false),
  externalCheckInPin: varchar("external_check_in_pin", { length: 6 }), // 6-digit PIN
  externalCheckInUrl: text("external_check_in_url"), // Unique URL identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").references(() => events.id),
  memberId: varchar("member_id").references(() => members.id),
  visitorId: varchar("visitor_id").references(() => visitors.id),
  attendanceDate: varchar("attendance_date", { length: 10 }).notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  checkInMethod: text("check_in_method").notNull(), // "fingerprint", "manual", "family", "visitor"
  isGuest: boolean("is_guest").default(false),
  // Denormalized fields for visitors to avoid complex joins
  visitorName: text("visitor_name"),
  visitorGender: text("visitor_gender"),
  visitorAgeGroup: text("visitor_age_group"),
});

export const followUpRecords = pgTable("follow_up_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id),
  lastContactDate: timestamp("last_contact_date"),
  contactMethod: text("contact_method"), // "sms", "email"
  consecutiveAbsences: integer("consecutive_absences").default(0),
  needsFollowUp: boolean("needs_follow_up").default(false),
});

// Relations
export const churchesRelations = relations(churches, ({ many, one }) => ({
  members: many(members),
  events: many(events),
  attendanceRecords: many(attendanceRecords),
  followUpRecords: many(followUpRecords),
  visitors: many(visitors),
  churchUsers: many(churchUsers),
  subscriptions: many(subscriptions),
}));

export const churchUsersRelations = relations(churchUsers, ({ one }) => ({
  church: one(churches, {
    fields: [churchUsers.churchId],
    references: [churches.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  church: one(churches, {
    fields: [subscriptions.churchId],
    references: [churches.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  church: one(churches, {
    fields: [events.churchId],
    references: [churches.id],
  }),
  attendanceRecords: many(attendanceRecords),
}));

export const membersRelations = relations(members, ({ many, one }) => ({
  church: one(churches, {
    fields: [members.churchId],
    references: [churches.id],
  }),
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
  church: one(churches, {
    fields: [attendanceRecords.churchId],
    references: [churches.id],
  }),
  event: one(events, {
    fields: [attendanceRecords.eventId],
    references: [events.id],
  }),
  member: one(members, {
    fields: [attendanceRecords.memberId],
    references: [members.id],
  }),
  visitor: one(visitors, {
    fields: [attendanceRecords.visitorId],
    references: [visitors.id],
  }),
}));

export const followUpRecordsRelations = relations(followUpRecords, ({ one }) => ({
  church: one(churches, {
    fields: [followUpRecords.churchId],
    references: [churches.id],
  }),
  member: one(members, {
    fields: [followUpRecords.memberId],
    references: [members.id],
  }),
}));

export const communicationProvidersRelations = relations(communicationProviders, ({ one, many }) => ({
  church: one(churches, {
    fields: [communicationProviders.churchId],
    references: [churches.id],
  }),
  messageDeliveries: many(messageDeliveries),
}));

export const messageDeliveriesRelations = relations(messageDeliveries, ({ one }) => ({
  church: one(churches, {
    fields: [messageDeliveries.churchId],
    references: [churches.id],
  }),
  provider: one(communicationProviders, {
    fields: [messageDeliveries.providerId],
    references: [communicationProviders.id],
  }),
}));

// First-time visitors table for detailed visitor information
export const visitors = pgTable("visitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  churchId: varchar("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").references(() => members.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: varchar("gender", { length: 10 }), // male, female
  ageGroup: varchar("age_group", { length: 15 }), // child, adolescent, adult
  address: text("address"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  weddingAnniversary: varchar("wedding_anniversary", { length: 10 }),
  birthday: varchar("birthday", { length: 10 }),
  prayerPoints: text("prayer_points"),
  howDidYouHearAboutUs: text("how_did_you_hear_about_us"),
  comments: text("comments"),
  visitDate: timestamp("visit_date").defaultNow(),
  followUpStatus: varchar("follow_up_status", { length: 50 }).default("pending"), // pending, contacted, member
  assignedTo: varchar("assigned_to", { length: 255 }), // Pastor/volunteer assigned for follow-up
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const visitorsRelations = relations(visitors, ({ one, many }) => ({
  church: one(churches, {
    fields: [visitors.churchId],
    references: [churches.id],
  }),
  member: one(members, {
    fields: [visitors.memberId],
    references: [members.id],
  }),
  attendanceRecords: many(attendanceRecords),
}));

// Family relationship types
export const relationshipTypes = ["head", "spouse", "child", "parent", "sibling", "other"] as const;

// Insert schemas - using transform with refined validation
export const insertMemberSchema = createInsertSchema(members, {
  title: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid WhatsApp number format").optional().or(z.literal("")),
  dateOfBirth: z.string().optional().refine((date) => !date || new Date(date) < new Date(), "Date of birth must be in the past"),
  weddingAnniversary: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  ageGroup: z.enum(["child", "adolescent", "adult"]),
  address: z.string().optional().or(z.literal("")),
  fingerprintId: z.string().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  // New family fields
  familyGroupId: z.string().optional().or(z.literal("")),
  relationshipToHead: z.enum(relationshipTypes).default("head"),
  isFamilyHead: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // Note: churchId is NOT omitted - it will be added by server and must be included in validation
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
  // New family fields
  familyGroupId: z.string().optional(),
  relationshipToHead: z.enum(relationshipTypes).optional(),
  isFamilyHead: z.boolean().optional(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords, {
  attendanceDate: z.string(),
  checkInMethod: z.enum(["fingerprint", "manual", "family", "visitor", "external"]),
  memberId: z.string().optional(),
  visitorId: z.string().optional(),
  visitorName: z.string().optional(),
  visitorGender: z.enum(["male", "female"]).optional(),
  visitorAgeGroup: z.enum(["child", "adolescent", "adult"]).optional(),
}).omit({
  id: true,
  checkInTime: true,
}).superRefine((data, ctx) => {
  // Either memberId or visitorId must be provided (but not both)
  const hasMember = data.memberId && data.memberId.trim() !== "";
  const hasVisitor = data.visitorId && data.visitorId.trim() !== "";
  
  if (!hasMember && !hasVisitor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either memberId or visitorId must be provided",
      path: ["memberId"],
    });
  }
  
  if (hasMember && hasVisitor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot provide both memberId and visitorId",
      path: ["memberId"],
    });
  }
  
  // If visitorId is provided, visitor demographic fields should be provided
  if (hasVisitor && (!data.visitorName || !data.visitorGender || !data.visitorAgeGroup)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Visitor demographic fields (name, gender, ageGroup) are required for visitor check-ins",
      path: ["visitorName"],
    });
  }
});

export const insertFollowUpRecordSchema = createInsertSchema(followUpRecords).omit({
  id: true,
});

export const insertVisitorSchema = createInsertSchema(visitors, {
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  ageGroup: z.enum(["child", "adolescent", "adult"], { required_error: "Age group is required" }),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format").optional().or(z.literal("")),
  whatsappNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid WhatsApp number format").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  prayerPoints: z.string().optional().or(z.literal("")),
  howDidYouHearAboutUs: z.string().optional().or(z.literal("")),
  comments: z.string().optional().or(z.literal("")),
  assignedTo: z.string().optional().or(z.literal("")),
  weddingAnniversary: z.string().optional().or(z.literal("")).optional(),
  birthday: z.string().optional().or(z.literal("")).optional(),
  followUpStatus: z.enum(["pending", "contacted", "member"]).default("pending"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  visitDate: true,
  churchId: true, // Exclude churchId for client-side forms
});

export const insertEventSchema = createInsertSchema(events, {
  eventType: z.enum(["sunday_service", "prayer_meeting", "bible_study", "youth_group", "special_event", "other"]),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional().refine((val) => !val || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
    message: "Invalid time format (HH:MM)"
  }),
  endTime: z.string().nullable().optional().refine((val) => !val || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
    message: "Invalid time format (HH:MM)"
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// External check-in specific schemas
export const externalCheckInSchema = z.object({
  eventUrl: z.string(),
  pin: z.string().length(6, "PIN must be exactly 6 digits"),
  memberId: z.string().uuid("Invalid member ID"),
  checkInMethod: z.literal('external'),
});

export const enableExternalCheckInSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  enabled: z.boolean(),
});

export const externalCheckInAttemptSchema = z.object({
  pin: z.string().length(6, "PIN must be exactly 6 digits"),
  memberId: z.string().uuid("Invalid member ID"),
});

// Communication Providers Schemas
export const insertCommunicationProviderSchema = createInsertSchema(communicationProviders, {
  providerType: z.enum(["sms", "email"]),
  providerName: z.string().min(1, "Provider name is required"),
  displayName: z.string().min(1, "Display name is required"),
  credentials: z.string().min(1, "Credentials are required"),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCommunicationProviderSchema = z.object({
  displayName: z.string().min(1).optional(),
  credentials: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  testStatus: z.enum(["connected", "failed", "untested"]).optional(),
  testMessage: z.string().optional(),
});

export const testCommunicationProviderSchema = z.object({
  providerId: z.string().uuid(),
  testRecipient: z.string().min(1, "Test recipient is required"),
});

export const insertMessageDeliverySchema = createInsertSchema(messageDeliveries, {
  messageType: z.enum(["birthday", "followup", "event", "bulk"]),
  recipientType: z.enum(["member", "visitor"]),
  recipientContact: z.string().min(1, "Recipient contact is required"),
  messageContent: z.string().min(1, "Message content is required"),
  deliveryStatus: z.enum(["sent", "delivered", "failed", "pending"]).default("pending"),
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type UpdateMember = z.infer<typeof updateMemberSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type FollowUpRecord = typeof followUpRecords.$inferSelect;
export type InsertFollowUpRecord = z.infer<typeof insertFollowUpRecordSchema>;
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type CommunicationProvider = typeof communicationProviders.$inferSelect;
export type InsertCommunicationProvider = z.infer<typeof insertCommunicationProviderSchema>;
export type UpdateCommunicationProvider = z.infer<typeof updateCommunicationProviderSchema>;
export type TestCommunicationProvider = z.infer<typeof testCommunicationProviderSchema>;
export type MessageDelivery = typeof messageDeliveries.$inferSelect;
export type InsertMessageDelivery = z.infer<typeof insertMessageDeliverySchema>;

// External check-in types
export type ExternalCheckIn = z.infer<typeof externalCheckInSchema>;
export type EnableExternalCheckIn = z.infer<typeof enableExternalCheckInSchema>;
export type ExternalCheckInAttempt = z.infer<typeof externalCheckInAttemptSchema>;

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

// Multi-tenant schema definitions
export const insertChurchSchema = createInsertSchema(churches, {
  name: z.string().min(1, "Church name is required"),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens").optional(),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Brand color must be a valid hex color").optional(),
  subscriptionTier: z.enum(["trial", "starter", "growth", "enterprise"]).default("trial"),
  maxMembers: z.number().positive("Max members must be positive").default(100),
  kioskModeEnabled: z.boolean().default(false),
  kioskSessionTimeout: z.number().min(5).max(1440).default(60),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  trialStartDate: true,
  trialEndDate: true,
});

export const insertChurchUserSchema = createInsertSchema(churchUsers, {
  email: z.string().email("Invalid email format"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["admin", "volunteer", "data_viewer"]).default("admin"),
  passwordHash: z.string().min(1, "Password is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  planId: z.enum(["starter", "growth", "enterprise"]),
  status: z.enum(["active", "canceled", "past_due", "trialing", "incomplete"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateChurchBrandingSchema = z.object({
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  bannerUrl: z.string().url("Invalid banner URL").optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Brand color must be a valid hex color").optional(),
});

export const kioskSettingsSchema = z.object({
  kioskModeEnabled: z.boolean(),
  kioskSessionTimeout: z.number().min(5).max(1440), // 5 minutes to 24 hours
});

// Multi-tenant types
export type Church = typeof churches.$inferSelect;
export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type ChurchUser = typeof churchUsers.$inferSelect;
export type InsertChurchUser = z.infer<typeof insertChurchUserSchema>;
export type SuperAdmin = typeof superAdmins.$inferSelect;
export type InsertSuperAdmin = typeof superAdmins.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
