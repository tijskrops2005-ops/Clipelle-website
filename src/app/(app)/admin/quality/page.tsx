import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoading from "../loading";
import { requireAdmin } from "@/lib/admin";
import { config } from "@/lib/config";
import { DemoAdminNotice } from "@/components/admin/DemoAdminNotice";
import { listQualityReports, listUnchecked } from "@/lib/quality/server";
import { QualityView } from "@/components/admin/QualityView";

export const metadata: Metadata = { title: "Quality", robots: { index: false, follow: false } };

/** Quality reports of finished translations (28 Oct 2026): automatic checks next to Tijs's own verdict. */
export default function QualityPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <QualityInner />
    </Suspense>
  );
}

async function QualityInner() {
  const user = await requireAdmin();
  if (config.demoMode) return <DemoAdminNotice title="Quality" />;
  const [reports, unchecked] = await Promise.all([listQualityReports(), listUnchecked(user.id)]);
  return <QualityView reports={reports} unchecked={unchecked.map((u) => ({ projectId: u.projectId, language: u.language, name: u.name }))} />;
}
