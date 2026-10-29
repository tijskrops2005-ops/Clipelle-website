import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CostsPanel } from "@/components/admin/CostsPanel";

export const metadata: Metadata = { title: "Costs", robots: { index: false, follow: false } };

/** The real cost of every paid call on the live site (29 Oct 2026): the /dev/costs overview, for administrators. */
export default async function AdminCostsPage() {
  await requireAdmin();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Costs"
        badge={<Badge tone="warning" className="translate-y-1">Administrators only</Badge>}
        description="Every paid call the app made, per run and per service, with the estimate, the actual amount and how that amount was determined. Rows marked “list price” are our own calculation: check them against the provider's dashboard."
        actions={<Button href="/admin" variant="secondary" size="sm">Back to admin</Button>}
      />
      <CostsPanel base="/api/admin/costs" />
    </div>
  );
}
