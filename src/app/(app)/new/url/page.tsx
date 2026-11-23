import type { Metadata } from "next";
import { config } from "@/lib/config";
import { CreateHeader } from "@/components/CreateHeader";
import { ComingSoonPanel } from "@/components/ComingSoonPanel";
import { UrlToVideo } from "@/components/UrlToVideo";

export const metadata: Metadata = { title: "New ad from a link" };

export default function NewUrlPage() {
  if (!config.features.ads) {
    return (
      <div className="space-y-10">
        <CreateHeader title="Ads from a link" />
        <ComingSoonPanel feature="ads_url" title="What it will do" text="The page reader fills the ad form; the same presenter, footage and captions follow." points={["Name, description, photos and price read from a public product page", "You check and edit everything before it is used", "Only the photos you tick are copied", "Then the same ad as from a photo"]} />
      </div>
    );
  }
  return (
    <div className="space-y-10">
      <CreateHeader title="New ad from a product link" text="Paste the link to a product page. We read the name, description and photos; you check them, and the same ad form opens prefilled." steps={["Paste the link", "Check the facts", "Same ad form", "Captions and 9:16"]} />
      <UrlToVideo />
    </div>
  );
}
