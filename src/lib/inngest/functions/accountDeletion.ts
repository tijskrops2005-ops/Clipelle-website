import { inngest } from "@/lib/inngest/client";
import { purgeDueAccounts } from "@/lib/accountLifecycle";

/** Daily (2 Nov 2026): removes accounts whose deletion was requested more than 30 days ago (src/lib/accountLifecycle.ts). */
export const accountDeletion = inngest.createFunction(
  { id: "account-deletion", name: "Remove accounts whose 30 days are over", retries: 2, triggers: [{ cron: "TZ=Europe/Amsterdam 30 4 * * *" }] },
  async ({ step }) => step.run("purge-due-accounts", async () => ({ removed: await purgeDueAccounts() })),
);
