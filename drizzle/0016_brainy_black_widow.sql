ALTER TABLE "projects" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_parent_idx" ON "projects" USING btree ("parent_id");