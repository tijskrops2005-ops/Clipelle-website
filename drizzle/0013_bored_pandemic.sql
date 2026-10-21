CREATE TABLE "career_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"area" text,
	"link" text,
	"message" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "career_interests_created_idx" ON "career_interests" USING btree ("created_at");