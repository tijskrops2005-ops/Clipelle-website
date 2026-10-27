import type { Metadata } from "next";
import { CreateHeader } from "@/components/CreateHeader";
import { TranslateForm } from "@/components/translate/TranslateForm";
import { LocalizeForm } from "@/components/translate/LocalizeForm";
import { translateStageStrip } from "@/lib/translateProgress";

export const metadata: Metadata = { title: "Translate a video" };

/** `?from=<id>` opens the form with that finished ad as the source ("Localize this ad"). */
export default async function NewTranslatePage({ searchParams }: { searchParams: Promise<{ from?: string; speaker?: string }> }) {
  const { from, speaker } = await searchParams;
  const presenter = speaker === "presenter";
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <CreateHeader eyebrow={presenter ? "Translate with a presenter" : "Translate & lip sync"} title={fromId ? "Localize this ad" : presenter ? "Translate with an AI presenter" : "Translate an existing video"} text={fromId ? "Pick the languages; the finished ad is the source, so there is nothing to upload. The translation is checked automatically." : presenter ? "Upload your video and pick the language. Every line is translated and checked, then a presenter you choose speaks it, with the voice and accent you pick." : "Upload a video you own and pick the languages. The speaker keeps their own voice, every line is checked and captions are added."} steps={translateStageStrip(presenter)} />
      {fromId ? <LocalizeForm fromId={fromId} /> : <TranslateForm key={presenter ? "presenter" : "original"} initialSpeaker={presenter ? "presenter" : "original"} />}
    </div>
  );
}
