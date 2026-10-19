import { devHello, inngest } from "@/lib/inngest/client";

/**
 * Smoke test for the job system (dev only in practice; harmless in production).
 * - "greet": a normal step.
 * - "flaky": throws on the first attempt when `failOnce` is set, so the dev server shows a retry.
 * - "pause": a short sleep, the mechanism the orchestrator uses while polling a provider.
 * - result: returned when done.
 */
export const helloFunction = inngest.createFunction(
  { id: "dev-hello", name: "Dev: hello (smoke test)", retries: 2, triggers: [devHello] },
  async ({ event, step, attempt }) => {
    const greeting = await step.run("greet", async () => `Hello, ${event.data.name}!`);

    const flaky = await step.run("flaky", async () => {
      if (event.data.failOnce && attempt === 0) {
        throw new Error("Simulated provider hiccup on the first attempt (this is expected; the step retries).");
      }
      return { attempt, note: attempt === 0 ? "succeeded first time" : `succeeded on attempt ${attempt + 1}` };
    });

    await step.sleep("pause", "5s");

    return { greeting, flaky, finishedAt: new Date().toISOString() };
  },
);
