CREATE TABLE "quality_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"language" text NOT NULL,
	"score" integer,
	"status" text DEFAULT 'running' NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"cost_usd" double precision,
	"rating" text,
	"labels" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"rated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quality_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quality_reports" ADD CONSTRAINT "quality_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quality_reports_project_idx" ON "quality_reports" USING btree ("project_id","language","created_at");--> statement-breakpoint
CREATE INDEX "quality_reports_created_idx" ON "quality_reports" USING btree ("created_at");