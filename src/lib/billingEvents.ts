/**
 * The Stripe events the billing webhook acts on (one list for the setup script, the docs and a test).
 * Subscribe the endpoint to exactly these; Stripe advises against subscribing to everything.
 */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;
