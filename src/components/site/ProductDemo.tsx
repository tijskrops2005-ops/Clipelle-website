import { Check, ImageUp, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { firstExample } from "@/lib/examples";
import { adCredits } from "@/lib/plans";
import { dict } from "@/content/i18n";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { LazyVideo } from "@/components/site/LazyVideo";
import { AdSketch } from "@/components/site/Sketches";

/**
 * "See it run" (25 Oct 2026, pattern after reign.com's self-clicking product demo): a drawn copy
 * of the ad form in a browser frame, played by CSS in one 12-second loop: a cursor drops a photo,
 * the name types itself, Generate is pressed, the four steps run and the finished ad appears (our
 * own sample, or a drawn ad without one). Labelled as an illustration of the flow; under "reduce
 * motion" it shows the finished state.
 */
export async function ProductDemo({ locale, bare }: { locale: Locale; /** Without its own title: placed under another section's heading. */ bare?: boolean }) {
  const t = dict(locale);
  const d = t.home.demo;
  const sample = firstExample("ad");
  // Credits, as the real form shows them (26 Oct 2026): a 30-second Standard ad.
  const price = `${adCredits({ seconds: 30, engine: "avatar_iii" })} credits`;
  const demo = (
      <div className="demo relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-card border border-border bg-surface shadow-card-hover" aria-label={d.label} role="img">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-divider bg-bg px-4 py-3" aria-hidden>
          <span className="size-2.5 rounded-full bg-danger/60" /><span className="size-2.5 rounded-full bg-warning/60" /><span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 rounded-full bg-surface px-3 py-1 text-[11px] text-muted shadow-soft">clipelle.com/new/ad</span>
          <span className="label-mono ml-auto text-[10px] text-muted">{t.common.illustration}</span>
        </div>

        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[1.1fr_1fr]" aria-hidden>
          {/* the form */}
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium text-ink">{d.photo}</p>
              <div className="mt-1.5 flex h-24 items-center justify-center gap-3 rounded-[12px] border border-dashed border-border bg-bg">
                <ImageUp className="size-5 text-muted" />
                <span className="demo-photo grid size-16 place-items-center rounded-[10px] bg-[linear-gradient(160deg,#f1e8dd,#d7c6b2)] shadow-soft">
                  <span className="h-10 w-5 rounded-[5px] bg-[linear-gradient(180deg,#1f3a5f,#13263f)]" />
                </span>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink">{d.name}</p>
              <div className="mt-1.5 flex h-10 items-center rounded-[12px] border border-border bg-surface px-3 font-mono text-[14px] text-ink">
                <span className="demo-type inline-block overflow-hidden whitespace-nowrap">{d.typed}</span>
                <span className="ml-0.5 h-4 w-px animate-pulse bg-ink" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted">
              {d.chips.map((c) => <span key={c} className="rounded-full border border-border px-2.5 py-1">{c}</span>)}
            </div>
            <div className="demo-btn flex h-11 items-center justify-center gap-2 rounded-full bg-accent text-[14px] font-semibold text-white shadow-accent">
              <Sparkles className="size-4" />{d.button} · {price}
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
                {sample ? (
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[4px] border-ink bg-ink shadow-card-hover">
                    <LazyVideo src={sample.src} poster={sample.posterSrc} label={sample.title} />
                  </div>
                ) : (
                  <AdSketch compact label={t.common.illustration} words={t.home.showcaseWords[0]} />
                )}
              </div>
            </div>
          </div>

          {/* the cursor (wide screens: the layout below md stacks, where a cursor path would miss) */}
          <span className="demo-cursor pointer-events-none absolute z-10 hidden md:block">
            <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-md"><path d="M4 2l16 9-7 2-3 7z" fill="#111114" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </div>
  );
  if (bare) return demo;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={d.eyebrow} title={d.title} text={d.text} />
      {demo}
    </Reveal>
  );
}
