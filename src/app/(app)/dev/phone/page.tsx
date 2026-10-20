import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Phone preview" };

/** Developer-only: shows any app route inside a 390×844 frame to check the phone layout. 404 outside development. */
export default async function PhonePreviewPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { path } = await searchParams;
  const safePath = path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
  return (
    <div className="space-y-8">
      <PageHeader title="Phone preview" badge={<Badge>Free · local</Badge>} description={`Showing ${safePath} at 390 × 844. Change the path with ?path=/new/ad.`} />
      <iframe src={safePath} title={`Phone preview of ${safePath}`} width={390} height={844} className="rounded-[32px] border-8 border-ink bg-surface shadow-card-hover" />
    </div>
  );
}
