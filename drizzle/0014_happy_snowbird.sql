CREATE TABLE "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"plan_key" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invites_token_idx" ON "workspace_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_idx" ON "workspace_invites" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "workspaces_customer_idx" ON "workspaces" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_workspace_idx" ON "credit_ledger" USING btree ("workspace_id","created_at");--> statement-breakpoint
-- Backfill (21 October 2026): a personal workspace per existing account (profiles, plus any project
-- owner without a profile), the owner as member, projects / credits / API keys moved into it, and the
-- billing fields copied from the profile. Re-runnable: it only fills what is still empty.
INSERT INTO "workspaces" ("name", "kind", "owner_user_id", "plan_key", "stripe_customer_id", "stripe_subscription_id", "subscription_status", "current_period_end")
SELECT coalesce(nullif(p."name", ''), split_part(p."email", '@', 1), 'Personal'), 'personal', p."user_id", p."plan_key", p."stripe_customer_id", p."stripe_subscription_id", p."subscription_status", p."current_period_end"
FROM "profiles" p
WHERE NOT EXISTS (SELECT 1 FROM "workspaces" w WHERE w."owner_user_id" = p."user_id" AND w."kind" = 'personal');--> statement-breakpoint
INSERT INTO "workspaces" ("name", "kind", "owner_user_id")
SELECT DISTINCT 'Personal', 'personal', pr."owner_id"
FROM "projects" pr
WHERE pr."owner_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "workspaces" w WHERE w."owner_user_id" = pr."owner_id" AND w."kind" = 'personal');--> statement-breakpoint
INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT w."id", w."owner_user_id", 'owner' FROM "workspaces" w
WHERE NOT EXISTS (SELECT 1 FROM "workspace_members" m WHERE m."workspace_id" = w."id" AND m."user_id" = w."owner_user_id");--> statement-breakpoint
UPDATE "projects" pr SET "workspace_id" = w."id" FROM "workspaces" w WHERE pr."workspace_id" IS NULL AND w."kind" = 'personal' AND w."owner_user_id" = pr."owner_id";--> statement-breakpoint
UPDATE "credit_ledger" l SET "workspace_id" = w."id" FROM "workspaces" w WHERE l."workspace_id" IS NULL AND w."kind" = 'personal' AND w."owner_user_id" = l."user_id";--> statement-breakpoint
UPDATE "api_keys" k SET "workspace_id" = w."id" FROM "workspaces" w WHERE k."workspace_id" IS NULL AND w."kind" = 'personal' AND w."owner_user_id" = k."user_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_workspace_created_idx" ON "projects" USING btree ("workspace_id", "created_at");
