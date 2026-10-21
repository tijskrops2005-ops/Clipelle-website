ALTER TABLE "profiles" ADD COLUMN "notify_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_batches" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "notified_at" timestamp with time zone;