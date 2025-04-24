CREATE TABLE "ai_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"analysis_type" text NOT NULL,
	"input" json NOT NULL,
	"result" json NOT NULL,
	"confidence" real,
	"models" text[],
	"processing_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"messages" json NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"health_data_id" integer,
	"ecg_recording_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"average_heart_rate" integer,
	"min_heart_rate" integer,
	"max_heart_rate" integer,
	"average_oxygen_level" real,
	"average_blood_pressure_systolic" integer,
	"average_blood_pressure_diastolic" integer,
	"steps" integer,
	"calories_burned" integer,
	"sleep_duration" integer,
	"sleep_quality" text,
	"risk_assessment" integer,
	"nutrition_recommendations" json,
	"activity_recommendations" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ecg_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"data" json NOT NULL,
	"duration" integer NOT NULL,
	"abnormalities" text[],
	"analysis" json,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"relationship" text,
	"phone_number" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"priority" integer DEFAULT 1,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"triggered_by" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"health_data_id" integer,
	"ecg_recording_id" integer,
	"ai_analysis_id" integer,
	"contacted_emergency_services" boolean DEFAULT false,
	"contacted_emergency_contacts" boolean DEFAULT false,
	"location" json,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_room_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"available_beds" integer,
	"total_beds" integer,
	"status" text,
	"wait_time" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guardian_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"guardian_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"relationship" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"heart_rate" integer,
	"oxygen_level" real,
	"temperature" real,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"risk_level" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hospital_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"name" text NOT NULL,
	"doctors" integer,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hospital_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"visit_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"hira_id" text,
	"name" text NOT NULL,
	"type" text,
	"category" text,
	"address" text,
	"zip_code" text,
	"phone" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_emergency" boolean DEFAULT false,
	"is_open_24h" boolean DEFAULT false,
	"is_heart_center" boolean DEFAULT false,
	"specialty" text[],
	"opening_hours" json,
	"website_url" text,
	"image_url" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hospitals_hira_id_unique" UNIQUE("hira_id")
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"time_of_day" text[],
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"description" text,
	"side_effects" text[],
	"interaction_warnings" text[],
	"image_url" text,
	"is_current" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" serial PRIMARY KEY NOT NULL,
	"hira_id" text,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_open_24h" boolean DEFAULT false,
	"opening_hours" json,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pharmacies_hira_id_unique" UNIQUE("hira_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"age" integer,
	"gender" text,
	"role" text DEFAULT 'user' NOT NULL,
	"profile_image" text,
	"medical_conditions" text[],
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
