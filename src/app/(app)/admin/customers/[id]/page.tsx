import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { customerLedger, getCustomer, type CustomerDetail } from "@/lib/adminCustomers";
import { limitCaps } from "@/lib/customerLimits";
import { config } from "@/lib/config";
import { mockCustomers, mockLedger, mockPurchases } from "@/lib/mock/admin";
import { CustomerDetailView } from "@/components/admin/CustomerDetailView";

export const metadata: Metadata = { title: "Customer", robots: { index: false, follow: false } };

function mockDetail(id: string): CustomerDetail | null {
  const row = mockCustomers.find((c) => c.userId === id);
  if (!row) return null;
  return {
    row,
    limits: id === "demo-u3" ? { dailyUsd: 250, concurrentProjects: 10 } : {},
    videos: id === "demo-u1" ? 3 : 0,
    workspaces: [{ id: row.workspaceId ?? "w", name: `${row.name ?? "Personal"}`, kind: "personal", role: "owner", members: 1, createdAt: row.signedUpAt, planKey: row.planKey }],
    apiKeys: id === "demo-u1" ? [{ id: "k1", name: "Zapier", prefix: "rl_7f3a", lastUsedAt: row.lastActiveAt, revokedAt: null, createdAt: row.signedUpAt }] : [],
    purchases: mockPurchases.filter((p) => p.userId === id).map((p) => ({ id: p.id, createdAt: p.createdAt, item: p.item, credits: p.credits, amountCents: p.amountCents, currency: p.currency, status: p.status, termsVersion: p.termsVersion, termsAcceptedAt: p.termsAcceptedAt })),
    ledgerTotal: id === "demo-u1" ? mockLedger.length : 1,
    projects: id === "demo-u1" ? [{ id: "prj_006", name: "Founder story — DE + FR", workflow: "translate", status: "completed", createdAt: row.signedUpAt, credits: 56, realCostUsd: 1.9, batchId: null }] : [],
    batches: 0,
  };
}

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (config.demoMode) {
    const detail = mockDetail(id);
    if (!detail) notFound();
    const rows = id === "demo-u1" ? mockLedger : [{ id: "l0", createdAt: detail.row.signedUpAt, credits: 30, kind: "grant_free", note: "Free credits after verification" }];
    return <CustomerDetailView detail={detail} ledger={{ rows, total: rows.length }} caps={limitCaps()} demo />;
  }
  const detail = await getCustomer(id);
  if (!detail) notFound();
  const ledger = detail.row.workspaceId ? await customerLedger(detail.row.workspaceId) : { rows: [], total: 0 };
  return <CustomerDetailView detail={detail} ledger={ledger} caps={limitCaps()} />;
}
