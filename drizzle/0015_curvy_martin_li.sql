CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"sells" text,
	"ads_per_month" text,
	"message" text,
	"ip_hash" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "service_requests_created_idx" ON "service_requests" USING btree ("created_at");