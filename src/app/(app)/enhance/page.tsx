import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnhanceView } from "@/components/enhance/EnhanceView";

export const metadata: Metadata = { title: "Enhance" };

export default function EnhancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Enhance" description="Make a video or a product photo sharper, cleaner and bigger." />
      <Suspense fallback={null}>
        <EnhanceView />
      </Suspense>
    </div>
  );
}
