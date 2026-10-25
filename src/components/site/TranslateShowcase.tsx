import { ArrowRight, Languages } from "lucide-react";
import { resolveExampleFile } from "@/lib/examples";
import { translationShowcase } from "@/content/translationShowcase";
import { LanguageWall } from "@/components/site/Persuasion";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { TranslatePhones } from "@/components/site/TranslatePhones";
import { viaLogin } from "@/components/site/siteNav";

/**
 * The first thing under the hero (24 Oct 2026): one real translation, the original next to the
 * result, with the checked captions, the languages scrolling past and two buttons. The strongest
 * part of the product, shown with our own output only; a missing file shows nothing broken.
 */
export function TranslateShowcase({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const s = t.home.translate;
  const original = resolveExampleFile(translationShowcase.original.file);
  const result = resolveExampleFile(translationShowcase.result.file);
  const originalPoster = resolveExampleFile(translationShowcase.original.poster) ?? undefined;
  const resultPoster = resolveExampleFile(translationShowcase.result.poster) ?? undefined;
  const from = translationShowcase.original.language[locale];
  const to = translationShowcase.result.language[locale];

  return (
    <Reveal as="section">
      <SectionIntro eyebrow={s.eyebrow} title={s.title} text={s.text} />

      <div className="stage-panel relative mt-12 overflow-hidden rounded-card px-4 py-10 shadow-card sm:px-10 sm:py-14">
        <div className="stage-glow pointer-events-none absolute inset-x-[15%] inset-y-[5%]" aria-hidden />
        <TranslatePhones
          original={{ key: "original", label: `${s.original} · ${from}`, name: `${s.original} (${from})`, src: original, poster: originalPoster, videoLabel: `${s.original}, ${from}` }}
          result={{ key: "result", label: `${s.result} · ${to}`, name: `${s.result} (${to})`, src: result, poster: resultPoster, videoLabel: `${s.result}, ${to}, ${s.lipSync}` }}
          codes={`${translationShowcase.original.code} → ${translationShowcase.result.code}`}
          lipSync={s.lipSync}
          soundOn={s.soundOn}
          soundOff={s.soundOff}
          soundHint={s.soundHint}
        />
      </div>

      <LanguageWall locale={locale} />

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href={viaLogin("/new/translate")} variant="accent" size="lg"><Languages className="size-5" aria-hidden />{s.cta}</Button>
        <Button href={localizePath("/platform/translate", locale)} variant="secondary" size="lg">{s.how}<ArrowRight className="size-5" aria-hidden /></Button>
      </div>
    </Reveal>
  );
}
