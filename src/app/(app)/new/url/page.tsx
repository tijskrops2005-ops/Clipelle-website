import type { Metadata } from "next";
import { CreateHeader } from "@/components/CreateHeader";
import { UrlToVideo } from "@/components/UrlToVideo";

export const metadata: Metadata = { title: "New ad from a link" };

export default function NewUrlPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CreateHeader eyebrow="Ad from a product link" title="New ad from a product link" text="Paste the link to a product page. We read the name, description and photos; you check them, and the same ad form opens prefilled." steps={["Paste the link", "Check the facts", "Same ad form", "Captions and 9:16"]} />
      <UrlToVideo />
    </div>
  );
}
