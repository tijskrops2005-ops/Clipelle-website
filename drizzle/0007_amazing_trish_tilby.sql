CREATE TABLE "notify_wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notify_wishes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"brand" jsonb,
	"plan_key" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"current_period_end" timestamp with time zone,
	"free_ad_granted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "cost_entries" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "steps" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "notify_wishes_user_feature_idx" ON "notify_wishes" USING btree ("user_id","feature");
-- Backfill: related rows copy the owner of their project; projects without an owner go to the dev user
-- (DEV_USER_ID can later claim them via POST /api/dev/claim-projects).
UPDATE "projects" SET "owner_id" = '00000000-0000-0000-0000-000000000001' WHERE "owner_id" IS NULL;
UPDATE "steps" s SET "user_id" = p."owner_id" FROM "projects" p WHERE s."project_id" = p."id" AND s."user_id" IS NULL;
UPDATE "assets" a SET "user_id" = p."owner_id" FROM "projects" p WHERE a."project_id" = p."id" AND a."user_id" IS NULL;
UPDATE "translations" t SET "user_id" = p."owner_id" FROM "projects" p WHERE t."project_id" = p."id" AND t."user_id" IS NULL;
UPDATE "cost_entries" c SET "user_id" = p."owner_id" FROM "projects" p WHERE c."project_id" = p."id" AND c."user_id" IS NULL;
CREATE INDEX IF NOT EXISTS "cost_entries_user_started_idx" ON "cost_entries" ("user_id", "started_at");
