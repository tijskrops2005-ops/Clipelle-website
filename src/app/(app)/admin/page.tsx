import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoading from "./loading";
import { getAdminStats, requireAdmin, type Period } from "@/lib/admin";
import { AdminView } from "@/components/admin/AdminView";
import { config } from "@/lib/config";
import { DemoAdminNotice } from "@/components/admin/DemoAdminNotice";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Read-only numbers for administrators (ADMIN_EMAILS); a hard 404 for everyone else. */
export default function AdminPage(props: { searchParams: Promise<{ period?: string }> }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminOverview {...props} />
    </Suspense>
  );
}

async function AdminOverview({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  if (config.demoMode) return <DemoAdminNotice title="Admin" />;
  const { period: raw } = await searchParams;
  const period: Period = raw === "day" || raw === "week" || raw === "month" ? raw : "week";
  const stats = await getAdminStats(period);
  return <AdminView stats={stats} />;
}
