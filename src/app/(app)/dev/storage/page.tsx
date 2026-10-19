import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoragePanel } from "./StoragePanel";

export const metadata: Metadata = { title: "Storage" };

/** Developer-only: storage usage meter, a direct-upload test and a copy-from-URL test. 404 outside development. */
export default function StoragePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Storage"
        badge={<Badge>Free · own bucket</Badge>}
        description="Our own file storage (Supabase Storage, private bucket). The meter counts every object against the 1 GB of the free plan. The upload test sends a file straight from the browser with a signed URL; the copy test pulls a provider URL into storage, exactly what the orchestrator does after every step."
      />
      <StoragePanel />
    </div>
  );
}
