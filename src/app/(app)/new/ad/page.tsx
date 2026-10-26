import type { Metadata } from "next";
import { CreateHeader } from "@/components/CreateHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { VersionForm } from "@/components/VersionForm";
import { isFormatKey } from "@/content/formats";

export const metadata: Metadata = { title: "New ad" };

const steps = ["Script", "Product clip", "AI presenter", "Captions and 9:16"];

/** `?from=<id>` opens the form as a new version of that ad, with everything prefilled. */
export default async function NewAdPage({ searchParams }: { searchParams: Promise<{ from?: string; format?: string; variations?: string }> }) {
  const { from, format, variations } = await searchParams;
  const withVariations = variations === "1";
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  const formatKey = typeof format === "string" && isFormatKey(format) ? format : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CreateHeader eyebrow="Ad from a product photo" title={withVariations ? "Variations of your ad" : fromId ? "Another version of your ad" : "New ad from a product photo"} text={fromId ? "Same product, same photos. Change what you want to try differently and generate; the earlier ad is kept." : "Tell us about the product once. After you click Generate, the steps run on their own and the finished ad lands on your dashboard."} steps={steps} />

      {fromId ? <VersionForm fromId={fromId} variations={withVariations} /> : <ProjectForm initial={formatKey || withVariations ? { settings: { format: formatKey, variations: withVariations } } : undefined} />}
    </div>
  );
}
