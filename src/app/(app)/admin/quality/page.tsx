import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listQualityReports, listUnchecked } from "@/lib/quality/server";
import { QualityView } from "@/components/admin/QualityView";

export const metadata: Metadata = { title: "Quality", robots: { index: false, follow: false } };

/** Quality reports of finished translations (28 Oct 2026): automatic checks next to Tijs's own verdict. */
export default async function QualityPage() {
  const user = await requireAdmin();
  const [reports, unchecked] = await Promise.all([listQualityReports(), listUnchecked(user.id)]);
  return <QualityView reports={reports} unchecked={unchecked.map((u) => ({ projectId: u.projectId, language: u.language, name: u.name }))} />;
}
