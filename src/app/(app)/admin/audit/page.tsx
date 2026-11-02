import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoading from "../loading";
import { requireAdmin } from "@/lib/admin";
import { auditAdmins, listAudit, type AuditFilters } from "@/lib/adminAudit";
import { config } from "@/lib/config";
import { mockAudit } from "@/lib/mock/admin";
import { AuditView } from "@/components/admin/AuditView";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };

export default function AdminAuditPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AuditInner {...props} />
    </Suspense>
  );
}

async function AuditInner({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filters: AuditFilters = { admin: sp.admin?.trim() || undefined, action: sp.action?.trim() || undefined, customer: sp.customer?.trim() || undefined, from: sp.from || undefined, to: sp.to || undefined };
  if (config.demoMode) {
    const rows = mockAudit.filter((e) => (!filters.action || e.action === filters.action) && (!filters.customer || `${e.targetLabel ?? ""} ${e.targetUserId ?? ""}`.toLowerCase().includes(filters.customer.toLowerCase())));
    return <AuditView entries={rows} filters={filters} admins={["admin@clipelle.local"]} demo />;
  }
  const [entries, admins] = await Promise.all([listAudit(filters), auditAdmins()]);
  return <AuditView entries={entries} filters={filters} admins={admins} />;
}
