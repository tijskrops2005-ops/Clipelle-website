import type { Metadata } from "next";
import { getAdminStats, requireAdmin, type Period } from "@/lib/admin";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Read-only numbers for administrators (ADMIN_EMAILS); a hard 404 for everyone else. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const { period: raw } = await searchParams;
  const period: Period = raw === "day" || raw === "week" || raw === "month" ? raw : "week";
  const stats = await getAdminStats(period);
  return <AdminView stats={stats} />;
}
