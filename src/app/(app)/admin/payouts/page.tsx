import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listReferredPurchases } from "@/lib/adminPayouts";
import { payoutEstimate } from "@/lib/payouts";
import { config } from "@/lib/config";
import { mockPurchases } from "@/lib/mock/admin";
import { PayoutsView } from "@/components/admin/PayoutsView";

export const metadata: Metadata = { title: "Payouts", robots: { index: false, follow: false } };

/** The partner platform where the real payouts happen (the app never pays anyone). */
const PLATFORM_URL = process.env.NEXT_PUBLIC_PARTNER_PLATFORM_URL?.trim() || "https://app.getreditus.com";

export default async function AdminPayoutsPage() {
  await requireAdmin();
  const purchases = config.demoMode ? mockPurchases : await listReferredPurchases();
  return <PayoutsView rows={payoutEstimate(purchases)} platformUrl={PLATFORM_URL} demo={config.demoMode} />;
}
