import { connection } from "next/server";
import Stripe from "stripe";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getWorkspace } from "@/lib/workspaces";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { databaseModeOnly } from "@/app/api/projects/_guard";

export type InvoiceRow = { id: string; number: string | null; date: string; amount: number; currency: string; status: string; item: string; url: string | null; pdf: string | null };

/**
 * The workspace's invoices (26 Nov 2026, Tijs: an Invoices link in the sidebar), newest first, from
 * Stripe: plans, credit packs (checkout creates an invoice for them) and auto-reload. A customer id
 * Stripe no longer knows (test mode before going live) gives an empty list, not an error.
 */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    const ws = await getWorkspace(scope.workspaceId);
    if (!ws || !stripeEnabled() || !ws.stripeCustomerId) return Response.json({ enabled: stripeEnabled(), invoices: [] as InvoiceRow[] });
    let list: Stripe.Invoice[] = [];
    try {
      list = (await stripe().invoices.list({ customer: ws.stripeCustomerId, limit: 36 })).data;
    } catch (error) {
      if (!(error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing")) throw error;
    }
    const invoices: InvoiceRow[] = list
      .filter((i) => i.status !== "draft" && i.status !== "void")
      .map((i) => ({
        id: i.id,
        number: i.number ?? null,
        date: new Date((i.status_transitions?.paid_at ?? i.created) * 1000).toISOString(),
        amount: (i.amount_paid || i.amount_due) / 100,
        currency: i.currency,
        status: i.status ?? "open",
        item: i.lines?.data[0]?.description ?? i.description ?? "Clipelle",
        url: i.hosted_invoice_url ?? null,
        pdf: i.invoice_pdf ?? null,
      }));
    return Response.json({ enabled: true, invoices });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
