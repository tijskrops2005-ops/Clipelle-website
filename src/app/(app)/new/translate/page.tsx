import type { Metadata } from "next";
import { CreateHeader } from "@/components/CreateHeader";
import { TranslateForm } from "@/components/translate/TranslateForm";
import { LocalizeForm } from "@/components/translate/LocalizeForm";

export const metadata: Metadata = { title: "Translate a video" };

const steps = ["Upload", "Translate & check", "Lip sync", "Captions and 9:16"];

/** `?from=<id>` opens the form with that finished ad as the source ("Localize this ad"). */
export default async function NewTranslatePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CreateHeader eyebrow="Translate & lip sync" title={fromId ? "Localize this ad" : "Translate an existing video"} text={fromId ? "Pick the languages; the finished ad is the source, so there is nothing to upload. The translation is checked automatically." : "Upload a video you own and pick the languages. The speaker keeps their own voice, every line is checked and captions are added."} steps={steps} />
      {fromId ? <LocalizeForm fromId={fromId} /> : <TranslateForm />}
    </div>
  );
}
