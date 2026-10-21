import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { UrlToVideo } from "@/components/UrlToVideo";

export const metadata: Metadata = { title: "New ad from a link" };

export default function NewUrlPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader title="New ad from a product link" description="Paste the link to a product page. We read the name, description and photos; you check them, and the same ad form opens prefilled." />
      <UrlToVideo />
    </div>
  );
}
