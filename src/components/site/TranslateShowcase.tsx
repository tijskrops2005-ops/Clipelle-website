import { ArrowRight, Languages, Sparkles } from "lucide-react";
import { resolveExampleFile } from "@/lib/examples";
import { translationShowcase } from "@/content/translationShowcase";
import { LanguageWall } from "@/components/site/Persuasion";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { LazyVideo } from "@/components/site/LazyVideo";
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
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 lg:gap-10">
          <Phone label={`${s.original} · ${from}`} src={original} poster={originalPoster} videoLabel={`${s.original}, ${from}`} tone="muted" className="justify-self-center sm:justify-self-end" />

          {/* Connector: languages, a live wave and the arrow */}
          <div className="flex flex-row items-center justify-center gap-3 sm:flex-col" aria-hidden>
            <span className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold tracking-wide text-surface shadow-card">{translationShowcase.original.code} → {translationShowcase.result.code}</span>
            <span className="wave flex h-6 items-center gap-[3px] text-accent"><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /></span>
            <ArrowRight className="size-6 rotate-90 text-ink/40 sm:rotate-0" />
          </div>

          <div className="justify-self-center sm:justify-self-start">
            <Phone label={`${s.result} · ${to}`} src={result} poster={resultPoster} videoLabel={`${s.result}, ${to}, ${s.lipSync}`} tone="accent" big />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink"><Sparkles className="size-4 text-accent" aria-hidden />{s.lipSync}</p>
          </div>
        </div>

      </div>

      <LanguageWall locale={locale} />

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href={viaLogin("/new/translate")} variant="accent" size="lg"><Languages className="size-5" aria-hidden />{s.cta}</Button>
        <Button href={localizePath("/platform/translate", locale)} variant="secondary" size="lg">{s.how}<ArrowRight className="size-5" aria-hidden /></Button>
      </div>
    </Reveal>
  );
}

function Phone({ label, src, poster, videoLabel, tone, big, className }: { label: string; src: string | null; poster?: string; videoLabel: string; tone: "muted" | "accent"; big?: boolean; className?: string }) {
  return (
    <figure className={className}>
      <div className={`relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-ink bg-ink shadow-card-hover ${big ? "w-[190px] sm:w-[230px]" : "w-[160px] sm:w-[190px] sm:opacity-95"}`}>
        {src ? <LazyVideo src={src} poster={poster} label={videoLabel} /> : <div className="grid size-full place-items-center bg-surface-muted text-[13px] text-muted">—</div>}
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-soft ${tone === "accent" ? "bg-accent text-white" : "bg-surface/90 text-ink"}`}>{label}</span>
      </div>
    </figure>
  );
}
