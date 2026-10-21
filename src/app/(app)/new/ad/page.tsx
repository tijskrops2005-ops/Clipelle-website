import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StepList } from "@/components/ui/StepList";
import { ProjectForm } from "@/components/ProjectForm";
import { VersionForm } from "@/components/VersionForm";
import { isFormatKey } from "@/content/formats";

export const metadata: Metadata = { title: "New ad" };

const afterwards = [
  { title: "Script", text: "A short spoken script is written from your description." },
  { title: "Product clip", text: "Your product photo is animated into short footage." },
  { title: "AI presenter", text: "A realistic presenter speaks the script on camera." },
  { title: "Final edit", text: "One 9:16 ad with captions. Nothing else is placed on screen." },
];

/** `?from=<id>` opens the form as a new version of that ad, with everything prefilled. */
export default async function NewAdPage({ searchParams }: { searchParams: Promise<{ from?: string; format?: string }> }) {
  const { from, format } = await searchParams;
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  const formatKey = typeof format === "string" && isFormatKey(format) ? format : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-6">
        <PageHeader
          title={fromId ? "Another version of your ad" : "New ad from a product photo"}
          description={fromId ? "Same product, same photos. Change what you want to try differently and generate; the earlier ad is kept." : "Tell us about the product once. After you click Generate, the steps run on their own and the finished ad lands on your dashboard."}
        />
        <StepList items={afterwards} columns={4} />
      </div>

      {fromId ? <VersionForm fromId={fromId} /> : <ProjectForm initial={formatKey ? { settings: { format: formatKey } } : undefined} />}
    </div>
  );
}
