import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, workspaces } from "@/lib/db";
import { getCreditBalance } from "@/lib/credits";
import { priceByLookupKey, stripe, stripeEnabled } from "@/lib/stripe";
import { automaticTaxEnabled, INVOICE_FOOTER, managedPaymentsEnabled } from "@/lib/billingCheckout";
import { CUSTOM_CREDITS } from "@/lib/plans";
import { AUTO_RELOAD_COOLDOWN_MS, monthKey, shouldAutoReload, type AutoReload } from "@/lib/autoReload";

/**
 * Auto-reload, the charge (26 Oct 2026). Called by the job after credits were reserved. A database
 * claim makes sure two projects starting at once never buy twice; the charge is a real Stripe invoice
 * (the per-credit price × quantity, VAT and our footer, partner commission off through the product)
 * paid with the saved card. Credits arrive with the `invoice.paid` webhook, never before.
 */
export async function runAutoReload(workspaceId: string, now = new Date()): Promise<{ charged: boolean; reason: string }> {
  if (!stripeEnabled()) return { charged: false, reason: "payments off" };
  if (managedPaymentsEnabled()) return { charged: false, reason: "not available with Managed Payments" };
  const [ws] = await db().select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws?.stripeCustomerId) return { charged: false, reason: "no billing account" };
  const balance = await getCreditBalance(ws.id);
  const decision = shouldAutoReload({ settings: ws.autoReload, balance, planKey: ws.planKey, now });
  if (!decision.go) return { charged: false, reason: decision.reason };

  // The claim: only one caller wins the window; the count for this month goes up with it.
  const month = monthKey(now);
  const since = new Date(now.getTime() - AUTO_RELOAD_COOLDOWN_MS).toISOString();
  const claimed = await db()
    .update(workspaces)
    .set({
      autoReload: sql`${workspaces.autoReload} || jsonb_build_object('lastAt', ${now.toISOString()}::text, 'month', ${month}::text, 'count', case when ${workspaces.autoReload}->>'month' = ${month} then coalesce((${workspaces.autoReload}->>'count')::int, 0) + 1 else 1 end)`,
    })
    .where(
      and(
        eq(workspaces.id, ws.id),
        sql`(${workspaces.autoReload}->>'enabled')::boolean = true`,
        sql`(${workspaces.autoReload}->>'lastAt' is null or (${workspaces.autoReload}->>'lastAt')::timestamptz < ${since}::timestamptz)`,
        sql`not (${workspaces.autoReload}->>'month' = ${month} and coalesce((${workspaces.autoReload}->>'count')::int, 0) >= coalesce((${workspaces.autoReload}->>'monthlyMax')::int, 0))`,
      ),
    )
    .returning({ autoReload: workspaces.autoReload });
  const state = claimed[0]?.autoReload as AutoReload | undefined;
  if (!state) return { charged: false, reason: "another reload is already running" };

  const credits = state.addCredits;
  try {
    const s = stripe();
    const unit = await priceByLookupKey(CUSTOM_CREDITS.stripeLookup);
    if (!unit) throw new Error("The per-credit price is not set up in Stripe yet.");
    const customer = await s.customers.retrieve(ws.stripeCustomerId);
    if (customer.deleted) throw new Error("The billing account no longer exists.");
    const currency = customer.currency === "eur" ? "eur" : "usd";
    // The card on the subscription, or the customer's default card.
    let paymentMethod = typeof customer.invoice_settings?.default_payment_method === "string" ? customer.invoice_settings.default_payment_method : customer.invoice_settings?.default_payment_method?.id;
    if (!paymentMethod && ws.stripeSubscriptionId) {
      const sub = await s.subscriptions.retrieve(ws.stripeSubscriptionId);
      paymentMethod = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id;
    }
    if (!paymentMethod) throw new Error("No saved card to charge.");
    const key = `clipelle-autoreload-${ws.id}-${month}-${state.count ?? 1}`;
    const metadata = { kind: "auto_reload", workspaceId: ws.id, userId: ws.ownerUserId, credits: String(credits) };
    const invoice = await s.invoices.create(
      {
        customer: ws.stripeCustomerId,
        currency,
        collection_method: "charge_automatically",
        auto_advance: false,
        default_payment_method: paymentMethod,
        footer: INVOICE_FOOTER,
        description: `Auto-reload: ${credits.toLocaleString("en-US")} credits`,
        metadata,
        ...(automaticTaxEnabled() ? { automatic_tax: { enabled: true } } : {}),
      },
      { idempotencyKey: `${key}-invoice` },
    );
    await s.invoiceItems.create({ customer: ws.stripeCustomerId, invoice: invoice.id, pricing: { price: unit.id }, quantity: credits, currency, metadata }, { idempotencyKey: `${key}-item` });
    await s.invoices.finalizeInvoice(invoice.id!, {}, { idempotencyKey: `${key}-finalize` });
    await s.invoices.pay(invoice.id!, {}, { idempotencyKey: `${key}-pay` });
    return { charged: true, reason: `invoice ${invoice.id}` };
  } catch (error) {
    // Any failure switches auto-reload off, so a card is never tried again and again; the owner sees why in Billing.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[auto-reload] ${ws.id}: ${message}`);
    await disableAutoReload(ws.id, "The automatic top-up did not go through. Check your card in the billing portal and turn auto-reload on again.");
    return { charged: false, reason: message };
  }
}

/** Switch auto-reload off after a failed payment, with a plain reason for the Billing page. */
export async function disableAutoReload(workspaceId: string, reason: string) {
  await db()
    .update(workspaces)
    .set({ autoReload: sql`coalesce(${workspaces.autoReload}, '{}'::jsonb) || jsonb_build_object('enabled', false, 'failedAt', ${new Date().toISOString()}::text, 'lastError', ${reason}::text)` })
    .where(eq(workspaces.id, workspaceId));
}
