import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Phone preview" };

/** Developer-only: shows any app route inside a 390×844 frame to check the phone layout. 404 outside development. */
export default function PhonePreviewPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-8">
      <PageHeader title="Phone preview" badge={<Badge>Free · local</Badge>} description="Any app route at 390 × 844. Change the path with ?path=/new/ad." />
      <Suspense fallback={<div className="h-[860px] w-[406px] animate-pulse rounded-[32px] bg-surface-muted" aria-hidden />}>
        <Frame searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Frame({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const { path } = await searchParams;
  const safePath = path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
  return <iframe src={safePath} title={`Phone preview of ${safePath}`} width={390} height={844} className="rounded-[32px] border-8 border-ink bg-surface shadow-card-hover" />;
}
