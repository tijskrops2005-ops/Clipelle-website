import { Check, Link2, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { firstExample } from "@/lib/examples";
import { dict } from "@/content/i18n";
import { LazyVideo } from "@/components/site/LazyVideo";
import { AdSketch } from "@/components/site/Sketches";
import { cn } from "@/lib/utils";

/**
 * Self-playing illustrations for the two feature rows (25 Oct 2026), in the style of ProductDemo:
 * CSS loops of 10 seconds (`.loop` keyframes in globals.css), labelled as illustrations, the
 * finished state under "reduce motion". Drawn faces only, never photos of people. Since 25 Oct 2026
 * a cursor walks the clicks (`.ad-cursor`, `.url-cursor`).
 */

const FACES = ["#e9c9a8", "#c58c5f", "#f1d4bc", "#8d5a3b"];

function Frame({ label, children, illustration, cursor }: { label: string; children: React.ReactNode; illustration: string; cursor: "ad-cursor" | "url-cursor" }) {
  return (
    <div className="loop relative w-full max-w-[500px] overflow-hidden rounded-card border border-border bg-surface shadow-card-hover" role="img" aria-label={label}>
      <div className="flex items-center gap-1.5 border-b border-divider bg-bg px-4 py-2.5" aria-hidden>
        <span className="size-2 rounded-full bg-danger/60" /><span className="size-2 rounded-full bg-warning/60" /><span className="size-2 rounded-full bg-success/60" />
        <span className="label-mono ml-auto text-[10px] text-muted">{illustration}</span>
      </div>
      <div className="relative grid grid-cols-[1fr_auto] items-center gap-4 p-4 sm:gap-6 sm:p-6" aria-hidden>
        {children}
        {/* A cursor that walks the same clicks as the loop (wide screens; on phones the layout is too tight for a path). */}
        <span className={`${cursor} pointer-events-none absolute z-10 hidden md:block`}>
          <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow-md"><path d="M4 2l16 9-7 2-3 7z" fill="#111114" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </div>
  );
}

function Result({ children, waitLabel }: { children: React.ReactNode; waitLabel: string }) {
  return (
    <div className="relative w-[112px] sm:w-[140px]">
      <div className="loop-wait absolute inset-0 grid place-items-center rounded-[22px] border-[4px] border-dashed border-border bg-bg text-[11px] text-muted">{waitLabel}</div>
      <div className="loop-out">{children}</div>
    </div>
  );
}

export function AdsDemo({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const d = t.home.featureDemos;
  const sample = firstExample("ad");
  return (
    <Frame label={d.adsLabel} illustration={t.common.illustration} cursor="ad-cursor">
      <div className="min-w-0 space-y-4">
        <div>
          <p className="text-[12px] font-medium text-ink">{d.presenter}</p>
          <div className="mt-2 flex gap-2">
            {FACES.map((skin, i) => (
              <span key={skin} className="relative grid size-10 place-items-center rounded-full bg-surface-muted sm:size-11">
                <svg viewBox="0 0 40 40" className="size-full"><circle cx="20" cy="16" r="8" fill={skin} /><path d="M6 38c2-9 8-13 14-13s12 4 14 13" fill={skin} opacity="0.85" /></svg>
                {i === 1 && <span className="ad-pick absolute -inset-1 rounded-full ring-2 ring-accent"><span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-accent text-white"><Check className="size-2.5" /></span></span>}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-medium text-ink">{d.length}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {[10, 20, 30, 45, 60].map((s) => (
              <span key={s} className={cn("rounded-full border border-border bg-surface px-2.5 py-1 text-muted", s === 30 && "ad-len")}>{s} s</span>
            ))}
          </div>
        </div>
        <div className="ad-go flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-[13px] font-semibold text-white shadow-accent"><Sparkles className="size-4" />{d.generate}</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><span className="ad-bar block h-full rounded-full bg-accent" /></div>
      </div>
      <Result waitLabel="9:16">
        {sample ? (
          <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[4px] border-ink bg-ink shadow-card-hover">
            <LazyVideo src={sample.src} poster={sample.posterSrc} label={sample.title} />
          </div>
        ) : (
          <AdSketch compact label={t.common.illustration} words={t.home.showcaseWords[1]} />
        )}
      </Result>
    </Frame>
  );
}

export function UrlDemo({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const d = t.home.featureDemos;
  const facts: [string, string, string][] = [[d.name, d.nameValue, "url-f1"], [d.price, d.priceValue, "url-f2"], [d.photos, d.photosValue, "url-f3"]];
  return (
    <Frame label={d.urlLabel} illustration={t.common.illustration} cursor="url-cursor">
      <div className="min-w-0 space-y-3">
        <p className="text-[12px] font-medium text-ink">{d.link}</p>
        <div className="flex items-center gap-2">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-border bg-bg px-2.5 font-mono text-[11.5px] text-ink">
            <Link2 className="size-3.5 shrink-0 text-muted" />
            <span className="url-type inline-block overflow-hidden whitespace-nowrap">{d.url}</span>
          </div>
          <span className="url-read shrink-0 rounded-[10px] bg-ink px-2.5 py-2 text-[11px] font-semibold text-surface">{d.read}</span>
        </div>
        <ul className="space-y-1.5">
          {facts.map(([k, v, cls]) => (
            <li key={k} className={cn(cls, "flex items-center justify-between gap-2 rounded-[10px] bg-surface-muted px-2.5 py-1.5 text-[11.5px]")}>
              <span className="text-muted">{k}</span>
              <span className="flex items-center gap-1.5 font-medium text-ink">{v}<span className="url-tick grid size-4 place-items-center rounded-full bg-success text-white"><Check className="size-2.5" /></span></span>
            </li>
          ))}
        </ul>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="relative aspect-square flex-1 rounded-[8px] bg-[linear-gradient(160deg,#f1e8dd,#d7c6b2)]">
              <span className="absolute inset-x-[38%] inset-y-[18%] rounded-[4px] bg-[linear-gradient(180deg,#1f3a5f,#13263f)]" />
              <span className="url-tick absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-success text-white"><Check className="size-2.5" /></span>
            </span>
          ))}
        </div>
        <div className="url-go flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent text-[12.5px] font-semibold text-white shadow-accent"><Sparkles className="size-3.5" />{d.create}</div>
      </div>
      <Result waitLabel="9:16">
        <AdSketch compact label={t.common.illustration} words={t.home.showcaseWords[0]} />
      </Result>
    </Frame>
  );
}
