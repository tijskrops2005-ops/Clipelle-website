CREATE TABLE "project_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
CREATE INDEX "project_batches_workspace_idx" ON "project_batches" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_batch_idx" ON "projects" USING btree ("batch_id");