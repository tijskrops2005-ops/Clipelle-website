import { NonRetriableError } from "inngest";
import { inngest, webhookDeliveryCreated } from "@/lib/inngest/client";
import { attemptDelivery, markDeliveryFailed } from "@/lib/webhooks/outgoing";

/**
 * Sends one outgoing webhook delivery. Inngest retries a failed attempt with backoff (up to 6
 * tries over roughly a day); after the last one the delivery is marked failed and can be
 * retried by hand from Settings → API keys → Webhooks.
 */
export const deliverWebhook = inngest.createFunction(
  {
    id: "webhook-deliver",
    name: "Deliver an outgoing webhook",
    retries: 5,
    triggers: [webhookDeliveryCreated],
    onFailure: async ({ event }) => {
      const deliveryId = (event.data.event.data as { deliveryId?: string })?.deliveryId;
      if (deliveryId) await markDeliveryFailed(deliveryId);
    },
  },
  async ({ event, step }) => {
    const { deliveryId } = event.data;
    const outcome = await step.run("deliver", () => attemptDelivery(deliveryId));
    if (!outcome.ok) {
      if (outcome.error === "Delivery not found." || outcome.error === "Endpoint removed or inactive.") throw new NonRetriableError(outcome.error);
      throw new Error(outcome.error ?? "Delivery failed");
    }
    return outcome;
  },
);
