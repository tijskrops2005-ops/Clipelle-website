import { eventType, Inngest } from "inngest";
import { z } from "zod";

/**
 * Inngest client: the app's background-job system (Stage 8).
 *
 * How it works: app code sends an *event* (`inngest.send(someEvent.create({...}))`). Inngest stores
 * it and calls our `/api/inngest` route to run the matching function. Each `step.run` inside a
 * function is saved when it finishes, so a failure retries only that step, and `step.waitForEvent`
 * / `step.sleep` pause a run for days without any server staying up.
 *
 * Local development: `npm run dev:jobs` starts the Inngest dev server on http://localhost:8288.
 * `INNGEST_DEV=1` (set by the `dev` script) makes the SDK talk to it instead of Inngest Cloud.
 * Production: INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY from the Inngest dashboard (step 11).
 */

export const inngest = new Inngest({ id: "clipelle" });

/* ---------- typed events (validated with zod when sent) ---------- */

/** Step 4 smoke test: proves the loop (send → run → step → retry → sleep → done). */
export const devHello = eventType("dev/hello", {
  schema: z.object({ name: z.string(), failOnce: z.boolean().optional() }),
});

/** Workflow A: a project row exists, run the ad pipeline. */
export const adProjectCreated = eventType("project/ad.created", {
  schema: z.object({ projectId: z.string().uuid() }),
});

/** Workflow B: a project row exists, run the translate pipeline. */
export const translateProjectCreated = eventType("project/translate.created", {
  schema: z.object({ projectId: z.string().uuid() }),
});

/** Workflow A with "Review script first": the user approved (and maybe edited) the script. */
export const adScriptApproved = eventType("project/ad-script.approved", {
  schema: z.object({ projectId: z.string().uuid() }),
});

/** A provider told us a job finished (incoming webhook): the job that waits on it wakes up and checks through the API. */
export const providerJobFinished = eventType("provider/job.finished", {
  schema: z.object({ provider: z.enum(["heygen", "fal", "shotstack"]), externalJobId: z.string().min(1), status: z.enum(["completed", "failed"]) }),
});

/** An outgoing webhook delivery row exists; send it (with retries). */
export const webhookDeliveryCreated = eventType("webhook/delivery.created", {
  schema: z.object({ deliveryId: z.string().uuid() }),
});

/** Retry one failed step of a project; the workflow resumes from there. */
export const stepRetry = eventType("project/step.retry", {
  schema: z.object({ projectId: z.string().uuid(), stepKey: z.string() }),
});
