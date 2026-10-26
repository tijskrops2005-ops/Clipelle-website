import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getWorkspace } from "@/lib/workspaces";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { databaseModeOnly } from "@/app/api/projects/_guard";
import type { PortalKind } from "@/lib/billingPortal";

/** The portal configuration made by scripts/stripe-setup.ts for this kind of workspace, cached per process. */
const configCache = new Map<PortalKind, string | null>();
async function portalConfiguration(kind: PortalKind) {
  if (configCache.has(kind)) return configCache.get(kind) ?? undefined;
  const list = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const id = list.data.find((c) => c.metadata?.clipelle_portal === kind)?.id ?? null;
  configCache.set(kind, id);
  return id ?? undefined; // none yet: Stripe's default configuration from the Dashboard
}

/** Stripe customer portal: change or cancel the plan, update the card, download invoices; the configuration fits the workspace kind. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireOwner();
    if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    const profile = (await getWorkspace(scope.workspaceId))!;
    if (!profile.stripeCustomerId) return Response.json({ error: "No billing account yet. Pick a plan first." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const configuration = await portalConfiguration(profile.kind === "team" ? "team" : "individual");
    const session = await stripe().billingPortal.sessions.create({ customer: profile.stripeCustomerId, return_url: `${origin}/settings/billing`, ...(configuration ? { configuration } : {}) });
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
