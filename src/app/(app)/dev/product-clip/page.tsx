import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductClipTestPanel } from "./ProductClipTestPanel";

export const metadata: Metadata = { title: "Product clip test" };

/** Developer-only test bench for step 3 (product photo → 9:16 clip via fal.ai). 404 outside development. */
export default function ProductClipTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const keyPresent = Boolean(process.env.FAL_KEY?.trim());

  return (
    <div className="space-y-10">
      <PageHeader
        title="Product clip test"
        badge={<Badge tone="danger">Live API · real costs</Badge>}
        description="Standalone check of the product clip step. First the photo is brought to 9:16, either by a free smart crop or by a paid AI expansion that leaves the original pixels untouched. Then an image-to-video model animates it into a 5-second clip. Every paid action asks for confirmation first."
      />
      <ProductClipTestPanel keyPresent={keyPresent} />
    </div>
  );
}
