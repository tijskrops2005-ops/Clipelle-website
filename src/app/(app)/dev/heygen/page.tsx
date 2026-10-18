import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { HeygenTestPanel } from "./HeygenTestPanel";

export const metadata: Metadata = { title: "HeyGen test" };

/**
 * Developer-only test bench for the HeyGen v3 integration (Stage 7, step 1).
 * Not linked from the navigation; returns 404 outside development.
 * Nothing here touches the demo store or the pipeline.
 */
export default function HeygenTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        title="HeyGen test"
        badge={<Badge tone="danger">Live API · real costs</Badge>}
        description="Standalone check of the presenter step: pick an avatar, a voice and an engine, enter a short script and create one real video. Listing and status calls are free; only creating a video costs credits, and only after you confirm."
      />
      <HeygenTestPanel />
    </div>
  );
}
