import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AffiliatePanel } from "@/components/AffiliatePanel";

export const metadata: Metadata = { title: "Affiliate" };

export default function AffiliatePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Affiliate" />
      <AffiliatePanel />
    </div>
  );
}
