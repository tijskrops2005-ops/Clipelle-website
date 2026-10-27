import { inngest } from "@/lib/inngest/client";
import { grantDueAnnualCredits } from "@/lib/billing";

/**
 * Annual plans get their credits every month (27 Oct 2026, Tijs): once a day this adds each month
 * that has started since the annual payment. Safe to run again: every month is granted once.
 */
export const annualCredits = inngest.createFunction(
  { id: "billing-annual-credits", name: "Monthly credits for annual plans", retries: 2, triggers: [{ cron: "TZ=Europe/Amsterdam 0 6 * * *" }] },
  async ({ step }) => step.run("grant-due-months", async () => ({ granted: await grantDueAnnualCredits() })),
);
