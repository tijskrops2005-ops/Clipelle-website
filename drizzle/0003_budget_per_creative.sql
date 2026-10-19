ALTER TABLE "cost_entries" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "error" text;--> statement-breakpoint
CREATE INDEX "cost_entries_project_idx" ON "cost_entries" USING btree ("project_id");