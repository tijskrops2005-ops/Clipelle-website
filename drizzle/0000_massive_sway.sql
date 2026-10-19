CREATE TYPE "public"."asset_kind" AS ENUM('source', 'image', 'script', 'product_clip', 'presenter', 'final', 'translated', 'srt', 'enhanced', 'captioned');--> statement-breakpoint
CREATE TYPE "public"."cost_service" AS ENUM('heygen', 'anthropic', 'fal', 'shotstack');--> statement-breakpoint
CREATE TYPE "public"."cost_status" AS ENUM('started', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'processing', 'review', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('waiting', 'processing', 'completed', 'failed', 'needs_input');--> statement-breakpoint
CREATE TYPE "public"."workflow_kind" AS ENUM('ad', 'translate');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"step_id" uuid,
	"kind" "asset_kind" NOT NULL,
	"language" text,
	"storage_path" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" bigint NOT NULL,
	"seconds" real,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" "cost_service" NOT NULL,
	"action" text NOT NULL,
	"estimated_usd" double precision NOT NULL,
	"actual_usd" double precision,
	"status" "cost_status" DEFAULT 'started' NOT NULL,
	"fingerprint" text NOT NULL,
	"project_id" uuid,
	"step_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"workflow" "workflow_kind" NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"input" jsonb NOT NULL,
	"detected_language" text,
	"rights_confirmed_at" timestamp with time zone,
	"final_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"status" "step_status" DEFAULT 'waiting' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"external_job_id" text,
	"output" jsonb,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"language" text NOT NULL,
	"status" "step_status" DEFAULT 'waiting' NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proofread_id" text,
	"translation_id" text,
	"video_asset_id" uuid,
	"srt_asset_id" uuid,
	"enhanced_asset_id" uuid,
	"captioned_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"event_type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_video_asset_id_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_srt_asset_id_assets_id_fk" FOREIGN KEY ("srt_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_enhanced_asset_id_assets_id_fk" FOREIGN KEY ("enhanced_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_captioned_asset_id_assets_id_fk" FOREIGN KEY ("captioned_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_project_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_storage_path_idx" ON "assets" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "cost_entries_fingerprint_idx" ON "cost_entries" USING btree ("fingerprint","started_at");--> statement-breakpoint
CREATE INDEX "cost_entries_started_idx" ON "cost_entries" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "projects_owner_created_idx" ON "projects" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "steps_project_key_idx" ON "steps" USING btree ("project_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_project_language_idx" ON "translations" USING btree ("project_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_dedupe_idx" ON "webhook_events" USING btree ("provider","external_id","event_type");