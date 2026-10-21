import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StepList } from "@/components/ui/StepList";
import { TranslateForm } from "@/components/translate/TranslateForm";
import { LocalizeForm } from "@/components/translate/LocalizeForm";

export const metadata: Metadata = { title: "Translate a video" };

const afterwards = [
  { title: "Upload", text: "Your video is checked and stored safely." },
  { title: "Translate", text: "AI translates the speech and checks every line against the original." },
  { title: "Captions and 9:16", text: "Voice and lips are matched; captions and the vertical format are added." },
];

/** `?from=<id>` opens the form with that finished ad as the source ("Localize this ad"). */
export default async function NewTranslatePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-6">
        <PageHeader
          title={fromId ? "Localize this ad" : "Translate an existing video"}
          description={fromId ? "Pick the languages; the finished ad is the source, so there is nothing to upload. The translation is checked automatically." : "Upload a video you own and pick the languages. The translation is checked automatically; nothing waits for you."}
        />
        <StepList items={afterwards} columns={3} />
      </div>
      {fromId ? <LocalizeForm fromId={fromId} /> : <TranslateForm />}
    </div>
  );
}
