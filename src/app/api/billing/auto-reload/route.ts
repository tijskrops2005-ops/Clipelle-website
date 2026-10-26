import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { db, workspaces } from "@/lib/db";
import { getWorkspace } from "@/lib/workspaces";
import { isPaidPlan } from "@/lib/plans";
import { stripeEnabled } from "@/lib/stripe";
import { managedPaymentsEnabled } from "@/lib/billingCheckout";
import { DEFAULT_AUTO_RELOAD, validAutoReload, type AutoReload } from "@/lib/autoReload";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ enabled: z.boolean(), belowCredits: z.number().int(), addCredits: z.number().int(), monthlyMax: z.number().int() });

/** Turn auto-reload on or off and choose its numbers (workspace owner only). Turning it on records the consent to charge the saved card. */
export async function PUT(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireOwner();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success || !validAutoReload(parsed.data)) return Response.json({ error: "Pick one of the offered amounts." }, { status: 400 });
    const ws = (await getWorkspace(scope.workspaceId))!;
    const next = parsed.data;
    if (next.enabled) {
      if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
      if (managedPaymentsEnabled()) return Response.json({ error: "Auto-reload is not available yet." }, { status: 400 });
      if (!isPaidPlan(ws.planKey) || !ws.stripeCustomerId) return Response.json({ error: "Auto-reload comes with a paid plan. Choose a plan first." }, { status: 400 });
    }
    const current = (ws.autoReload ?? DEFAULT_AUTO_RELOAD) as AutoReload;
    const saved: AutoReload = {
      ...current,
      ...next,
      ...(next.enabled && !current.enabled ? { consentAt: new Date().toISOString(), failedAt: undefined, lastError: undefined } : {}),
    };
    await db().update(workspaces).set({ autoReload: saved, updatedAt: new Date() }).where(eq(workspaces.id, ws.id));
    return Response.json({ autoReload: saved });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
