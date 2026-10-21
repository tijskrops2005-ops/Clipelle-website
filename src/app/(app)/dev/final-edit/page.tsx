import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinalEditTestPanel } from "./FinalEditTestPanel";

export const metadata: Metadata = { title: "Final edit test" };

/** Developer-only test bench for step 5 (final edit via Shotstack). 404 outside development. */
export default function FinalEditTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const keyPresent = Boolean(process.env.SHOTSTACK_API_KEY?.trim());
  const env = process.env.SHOTSTACK_ENV?.trim() === "v1" ? "v1" : "stage";

  return (
    <div className="space-y-10">
      <PageHeader
        title="Final edit test"
        badge={env === "stage" ? <Badge tone="warning">Sandbox · free · watermark</Badge> : <Badge tone="danger">Production · real costs</Badge>}
        description="Standalone check of the final edit: a presenter clip and a product clip become one 9:16 MP4 with captions as the only text on screen and no music. Defaults use the demo files in public/demo; paste URLs from the other test pages to use real output."
      />
      <FinalEditTestPanel keyPresent={keyPresent} env={env} />
    </div>
  );
}
