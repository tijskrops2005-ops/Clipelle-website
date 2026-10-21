import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getCreditBalance } from "@/lib/credits";
import { stripeEnabled } from "@/lib/stripe";
import { ensureFreeAd, freeAdsPerDay } from "@/lib/billing";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Plan, credits and whether payments are configured; also grants the free ad when due. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const user = await requireUser();
    const profile = await getOrCreateProfile(user);
    const free = await ensureFreeAd(user);
    return Response.json({
      enabled: stripeEnabled(),
      planKey: profile.planKey,
      subscriptionStatus: profile.subscriptionStatus,
      currentPeriodEnd: profile.currentPeriodEnd,
      balance: await getCreditBalance(user.id),
      freeAd: free,
      freeAdsPerDay: freeAdsPerDay(),
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
