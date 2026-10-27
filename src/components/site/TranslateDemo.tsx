import { Check, Film, Languages, UploadCloud } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { resolveExampleFile } from "@/lib/examples";
import { translationShowcase } from "@/content/translationShowcase";
import { dict } from "@/content/i18n";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { LazyVideo } from "@/components/site/LazyVideo";
import { cn } from "@/lib/utils";

/**
 * "See it translate" (25 Oct 2026, the translation twin of ProductDemo): a drawn copy of the translate
 * form in a browser frame, played by CSS in the same 12-second loop (`.demo` timing and step colours,
 * `.tdemo-*` for the cursor, the file and the language chips). The result is our real Dutch
 * translation. Labelled as an illustration; under "reduce motion" it shows the finished state.
 */
export function TranslateDemo({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const d = t.home.translateDemo;
  const result = resolveExampleFile(translationShowcase.result.file);
  const poster = resolveExampleFile(translationShowcase.result.poster) ?? undefined;
  const originalPoster = resolveExampleFile(translationShowcase.original.poster) ?? undefined;
  const picked = ["tdemo-l1", "tdemo-l2", "tdemo-l3"];
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={d.eyebrow} title={d.title} text={d.text} />
      <div className="demo relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-card border border-border bg-surface shadow-card-hover" aria-label={d.label} role="img">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-divider bg-bg px-4 py-3" aria-hidden>
          <span className="size-2.5 rounded-full bg-danger/60" /><span className="size-2.5 rounded-full bg-warning/60" /><span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 rounded-full bg-surface px-3 py-1 text-[11px] text-muted shadow-soft">clipelle.com/new/translate</span>
          <span className="label-mono ml-auto text-[10px] text-muted">{t.common.illustration}</span>
        </div>

        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[1.1fr_1fr]" aria-hidden>
          {/* the form */}
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium text-ink">{d.video}</p>
              <div className="mt-1.5 flex h-24 items-center justify-center gap-3 rounded-[12px] border border-dashed border-border bg-bg px-3">
                <UploadCloud className="size-5 shrink-0 text-muted" />
                <span className="tdemo-file flex items-center gap-2.5 rounded-[10px] bg-surface py-1.5 pl-1.5 pr-3 shadow-soft">
                  <span className="relative h-14 w-8 overflow-hidden rounded-[6px] bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {originalPoster ? <img src={originalPoster} alt="" className="size-full object-cover" /> : <Film className="m-auto mt-4 size-4 text-surface" />}
                  </span>
                  <span className="text-[12px] font-medium text-ink">{d.file}</span>
                </span>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink">{d.into}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
                {d.languages.map((l, i) => (
                  <span key={l} className={cn("rounded-full border border-border bg-surface px-2.5 py-1 text-muted", picked[i])}>{l}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted">
              {d.chips.map((c) => <span key={c} className="rounded-full border border-border px-2.5 py-1">{c}</span>)}
            </div>
            <div className="demo-btn flex h-11 items-center justify-center gap-2 rounded-full bg-accent text-[14px] font-semibold text-white shadow-accent">
              <Languages className="size-4" />{d.button}
            </div>
          </div>

          {/* the run and the result */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-5">
            <ol className="space-y-2.5">
              {d.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5">
                  <span className={`demo-s${i + 1} grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold`}>
                    <span className="relative">{i + 1}</span>
                  </span>
                  <span className="text-[13px] font-medium text-ink">{s}</span>
                  {i === 3 && <Check className="ml-auto size-4 text-success" />}
                </li>
              ))}
              <li className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><span className="demo-bar block h-full rounded-full bg-accent" /></li>
            </ol>
            <div className="relative w-[118px] sm:w-[140px]">
              <div className="demo-placeholder absolute inset-0 grid place-items-center rounded-[22px] border-[4px] border-dashed border-border bg-bg text-[11px] text-muted">9:16</div>
              <div className="demo-result">
                <div className="mb-1.5 flex justify-center gap-1">
                  {["NL", "DE", "FR"].map((c, i) => <span key={c} className={cn("rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold", i === 0 ? "bg-accent text-white" : "bg-surface-muted text-muted")}>{c}</span>)}
                </div>
                <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[4px] border-ink bg-ink shadow-card-hover">
                  {result ? <LazyVideo src={result} poster={poster} label="" /> : null}
                </div>
              </div>
            </div>
          </div>

          {/* the cursor (wide screens only: the layout below md stacks, where the path would miss) */}
          <span className="tdemo-cursor pointer-events-none absolute inset-0 z-10 hidden md:block">
            <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-md"><path d="M4 2l16 9-7 2-3 7z" fill="#111114" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </div>
    </Reveal>
  );
}
