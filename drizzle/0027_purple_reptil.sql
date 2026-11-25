CREATE TABLE "enhance_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"target" text NOT NULL,
	"file_name" text NOT NULL,
	"source_path" text NOT NULL,
	"source_mime" text,
	"seconds" real,
	"fps" real,
	"width" integer,
	"height" integer,
	"factor" real,
	"out_width" integer,
	"out_height" integer,
	"credits" integer,
	"result_path" text,
	"result_mime" text,
	"external_job_id" text,
	"error" text,
	"rights_confirmed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enhance_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "enhance_jobs_workspace_idx" ON "enhance_jobs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "enhance_jobs_status_idx" ON "enhance_jobs" USING btree ("status","updated_at");