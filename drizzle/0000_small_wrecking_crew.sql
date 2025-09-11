CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"region" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"event_id" varchar,
	"member_id" varchar,
	"visitor_id" varchar,
	"attendance_date" varchar(10) NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"check_in_method" text NOT NULL,
	"is_guest" boolean DEFAULT false,
	"visitor_name" text,
	"visitor_gender" text,
	"visitor_age_group" text
);
--> statement-breakpoint
CREATE TABLE "church_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "church_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" varchar(50),
	"logo_url" text,
	"banner_url" text,
	"brand_color" varchar(7) DEFAULT '#6366f1',
	"subscription_tier" varchar(20) DEFAULT 'trial' NOT NULL,
	"trial_start_date" timestamp DEFAULT now(),
	"trial_end_date" timestamp DEFAULT NOW() + INTERVAL '30 days',
	"subscription_start_date" timestamp,
	"max_members" integer DEFAULT 100,
	"kiosk_session_timeout" integer DEFAULT 60,
	"kiosk_mode_enabled" boolean DEFAULT false,
	"kiosk_session_start_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "churches_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "communication_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"provider_type" varchar(10) NOT NULL,
	"provider_name" varchar(30) NOT NULL,
	"display_name" text NOT NULL,
	"credentials" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_primary" boolean DEFAULT false,
	"test_status" varchar(20) DEFAULT 'untested',
	"test_message" text,
	"last_tested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"event_type" text DEFAULT 'sunday_service' NOT NULL,
	"organizer" text,
	"location" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" text,
	"start_date" varchar(10),
	"end_date" varchar(10),
	"start_time" text,
	"end_time" text,
	"max_attendees" integer,
	"is_active" boolean DEFAULT true,
	"external_check_in_enabled" boolean DEFAULT false,
	"external_check_in_pin" varchar(6),
	"external_check_in_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"last_contact_date" timestamp,
	"contact_method" text,
	"consecutive_absences" integer DEFAULT 0,
	"needs_follow_up" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"title" text,
	"first_name" text NOT NULL,
	"surname" text NOT NULL,
	"gender" text NOT NULL,
	"age_group" text NOT NULL,
	"phone" text,
	"email" text,
	"whatsapp_number" text,
	"address" text,
	"date_of_birth" varchar(10),
	"wedding_anniversary" varchar(10),
	"is_current_member" boolean DEFAULT true NOT NULL,
	"fingerprint_id" text,
	"parent_id" varchar,
	"family_group_id" varchar,
	"relationship_to_head" varchar(20) DEFAULT 'head',
	"is_family_head" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_deliveries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"message_type" varchar(20) NOT NULL,
	"recipient_type" varchar(10) NOT NULL,
	"recipient_id" varchar,
	"recipient_contact" text NOT NULL,
	"subject" text,
	"message_content" text NOT NULL,
	"delivery_status" varchar(20) DEFAULT 'pending',
	"provider_message_id" text,
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_config_id" varchar NOT NULL,
	"run_by_id" varchar NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"parameters" text,
	"file_path" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"stripe_subscription_id" varchar(255),
	"status" varchar(20) NOT NULL,
	"plan_id" varchar(50) NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" varchar(20) DEFAULT 'super_admin' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" varchar NOT NULL,
	"member_id" varchar,
	"name" text NOT NULL,
	"gender" varchar(10),
	"age_group" varchar(15),
	"address" text,
	"email" varchar(255),
	"phone" varchar(50),
	"whatsapp_number" varchar(50),
	"wedding_anniversary" varchar(10),
	"birthday" varchar(10),
	"prayer_points" text,
	"how_did_you_hear_about_us" text,
	"comments" text,
	"visit_date" timestamp DEFAULT now(),
	"follow_up_status" varchar(50) DEFAULT 'pending',
	"assigned_to" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_users" ADD CONSTRAINT "church_users_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_providers" ADD CONSTRAINT "communication_providers_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_provider_id_communication_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."communication_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_config_id_report_configs_id_fk" FOREIGN KEY ("report_config_id") REFERENCES "public"."report_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_run_by_id_admin_users_id_fk" FOREIGN KEY ("run_by_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;