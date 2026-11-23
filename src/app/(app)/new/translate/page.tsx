import type { Metadata } from "next";
import { CreateHeader } from "@/components/CreateHeader";
import { TranslateForm } from "@/components/translate/TranslateForm";
import { LocalizeForm } from "@/components/translate/LocalizeForm";
import { translateStageStrip } from "@/lib/translateProgress";

export const metadata: Metadata = { title: "Translate a video" };

/** `?from=<id>` opens the form with a stored video as the source: a finished ad ("Localize this ad") or, with `&more=1`, an earlier translation ("Add a language"). */
export default async function NewTranslatePage({ searchParams }: { searchParams: Promise<{ from?: string; speaker?: string; more?: string }> }) {
  const { from, speaker, more } = await searchParams;
  const presenter = speaker === "presenter";
  const fromId = typeof from === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(from) ? from : undefined;
  const addLanguage = Boolean(fromId) && more === "1";
  return (
    <div className="space-y-10">
      <CreateHeader
        title={addLanguage ? "Add a language" : fromId ? "Translate this ad" : presenter ? "Translate with a presenter" : "Translate a video"}
        steps={translateStageStrip(presenter)}
      />
      {fromId ? <LocalizeForm fromId={fromId} /> : <TranslateForm key={presenter ? "presenter" : "original"} initialSpeaker={presenter ? "presenter" : "original"} />}
    </div>
  );
}
