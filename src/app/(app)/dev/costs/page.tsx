import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { CostsPanel } from "./CostsPanel";

export const metadata: Metadata = { title: "Costs" };

/** Developer-only cost overview, read from cost_entries. 404 outside development; never linked for customers. */
export default function CostsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Costs"
        badge={<Badge>Free · read only</Badge>}
        description="Every paid call the app made, per run and per service, with the estimate, the actual amount and how that amount was determined. Rows marked “list price” are our own calculation: check them against the provider's dashboard."
      />
      <CostsPanel />
    </div>
  );
}
