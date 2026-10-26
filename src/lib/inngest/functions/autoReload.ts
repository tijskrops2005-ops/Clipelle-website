import { inngest, autoReloadCheck } from "@/lib/inngest/client";
import { runAutoReload } from "@/lib/billingAutoReload";

/**
 * Auto-reload after credits were reserved (26 Oct 2026). One run per workspace at a time; the charge
 * itself guards against doubles (database claim, Stripe idempotency keys), so a retry is safe.
 */
export const autoReload = inngest.createFunction(
  { id: "billing-auto-reload", name: "Auto-reload credits", retries: 1, concurrency: { key: "event.data.workspaceId", limit: 1 }, triggers: [autoReloadCheck] },
  async ({ event, step }) => step.run("charge", () => runAutoReload(event.data.workspaceId)),
);
