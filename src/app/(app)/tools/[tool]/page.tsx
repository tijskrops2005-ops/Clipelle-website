import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { MediaToolView } from "@/components/tools/MediaToolView";
import { isMediaToolKey, MEDIA_TOOLS } from "@/lib/mediaTools";

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  return { title: isMediaToolKey(tool) ? MEDIA_TOOLS[tool].title : "Tool" };
}

/** One page per single-step media tool: /tools/remove-text, /tools/captions, /tools/resize, /tools/remove-background. */
export default function MediaToolPage({ params }: Props) {
  // The URL is read inside the boundary (Cache Components: params outside <Suspense> block an instant navigation).
  return (
    <Suspense fallback={null}>
      <ToolBody params={params} />
    </Suspense>
  );
}

async function ToolBody({ params }: Props) {
  const { tool } = await params;
  if (!isMediaToolKey(tool)) notFound();
  const meta = MEDIA_TOOLS[tool];
  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={meta.description} />
      <MediaToolView tool={tool} />
    </div>
  );
}
