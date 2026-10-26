import { connection } from "next/server";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getCreditBalance } from "@/lib/credits";
import { stripeEnabled } from "@/lib/stripe";
import { ensureFreeAd, freeAdsPerDay, trialAvailable } from "@/lib/billing";
import { ensurePersonalWorkspace, getWorkspace } from "@/lib/workspaces";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Plan, credits and whether payments are configured, for the current workspace; also grants the free ad when due. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    await getOrCreateProfile(scope.user);
    const personal = await ensurePersonalWorkspace(scope.user);
    const free = await ensureFreeAd(scope.user, personal.id);
    const ws = (await getWorkspace(scope.workspaceId))!;
    return Response.json({
      enabled: stripeEnabled(),
      planKey: ws.planKey,
      // The free trial (26 Oct 2026): offered once, before the first subscription.
      trialAvailable: trialAvailable(ws),
      subscriptionStatus: ws.subscriptionStatus,
      currentPeriodEnd: ws.currentPeriodEnd,
      balance: await getCreditBalance(ws.id),
      freeAd: free,
      freeAdsPerDay: freeAdsPerDay(),
      emailVerified: scope.user.emailVerified,
      workspace: { id: ws.id, name: ws.name, kind: ws.kind, role: scope.role },
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
