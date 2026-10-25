-- 24 Oct 2026: several requests on a first sign-in could each create a personal workspace for the
-- same user. Merge the duplicates into one (the one with the most ledger rows and projects, then the
-- oldest), move everything that points at the others, then allow only one personal workspace per user.
CREATE TEMP TABLE "_ws_merge" ON COMMIT DROP AS
WITH ranked AS (
  SELECT w.id, w.owner_user_id,
    row_number() OVER (
      PARTITION BY w.owner_user_id
      ORDER BY
        (SELECT count(*) FROM credit_ledger c WHERE c.workspace_id = w.id) DESC,
        (SELECT count(*) FROM projects p WHERE p.workspace_id = w.id) DESC,
        w.created_at ASC,
        w.id ASC
    ) AS rn
  FROM workspaces w
  WHERE w.kind = 'personal'
)
SELECT loser.id AS loser_id, keeper.id AS keeper_id
FROM ranked loser
JOIN ranked keeper ON keeper.owner_user_id = loser.owner_user_id AND keeper.rn = 1
WHERE loser.rn > 1;--> statement-breakpoint
UPDATE "credit_ledger" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "projects" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "project_batches" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "api_keys" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "share_links" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "webhook_endpoints" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "webhook_deliveries" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
UPDATE "workspace_invites" t SET workspace_id = m.keeper_id FROM "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
DELETE FROM "workspace_members" t USING "_ws_merge" m WHERE t.workspace_id = m.loser_id;--> statement-breakpoint
DELETE FROM "workspaces" t USING "_ws_merge" m WHERE t.id = m.loser_id;--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_personal_owner_uq" ON "workspaces" USING btree ("owner_user_id") WHERE kind = 'personal';
