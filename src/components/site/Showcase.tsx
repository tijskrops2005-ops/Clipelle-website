import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, AudioLines, Captions, Clock3, Compass, FileCheck, Gauge, Image as ImageIcon, Languages, Mic, Palette, Smartphone, Smile, Stamp, Tag, UserRound, type LucideIcon } from "lucide-react";
import { resolvedExamples, type ResolvedExample } from "@/lib/examples";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { AdSketch, TranslateSketch } from "@/components/site/Sketches";
import { CountUp } from "@/components/motion/CountUp";
import { LazyVideo } from "@/components/site/LazyVideo";
import { cn } from "@/lib/utils";

/**
 * The showcase pieces of the homepage (23 Oct 2026, after the brand style guide): a fanned row of
 * 9:16 tiles under the hero, alternating feature rows with illustrated panels, a facts band and
 * the row of choices. Only our own sample videos and drawn illustrations appear here; tiles without
 * a sample are labelled as illustrations. All motion is CSS and off under "reduce motion".
 */

/* ---------- hero: fanned row of tiles ---------- */

const SLOTS = [
  { r: -9, y: 56, width: "w-[136px]", show: "hidden xl:block" },
  { r: -6, y: 34, width: "w-[150px]", show: "hidden md:block" },
  { r: -3, y: 14, width: "w-[104px] sm:w-[160px] md:w-[170px]", show: "" },
  { r: 0, y: 0, width: "w-[132px] sm:w-[190px] md:w-[200px]", show: "" },
  { r: 3, y: 14, width: "w-[104px] sm:w-[160px] md:w-[170px]", show: "" },
  { r: 6, y: 34, width: "w-[150px]", show: "hidden md:block" },
  { r: 9, y: 56, width: "w-[136px]", show: "hidden xl:block" },
] as const;

/** Sample videos take the middle slots; the rest are drawn ads with different caption colours (gold is allowed inside the dark frame). */
const ACCENTS = ["var(--accent)", "var(--gold-light)", "var(--warning)", "var(--accent)", "var(--gold-light)", "var(--warning)", "var(--accent)"];

/** One sample video in the same frame as the drawn ads (no fixed width: the parent decides). */
function VideoTile({ sample, label }: { sample: ResolvedExample; label: string }) {
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-ink bg-ink shadow-card-hover">
      <LazyVideo src={sample.src} poster={sample.posterSrc} label={`${sample.title}: ${sample.note}`} />
      <span className="label-mono absolute left-3 top-3 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] text-ink">{label}</span>
    </div>
  );
}

export function HeroShowcase({ words, illustrationLabel, sampleLabel, className }: { words: string[][]; illustrationLabel: string; sampleLabel: string; className?: string }) {
  const samples = resolvedExamples().slice(0, SLOTS.length);
  // Fill from the centre outwards so the samples sit in the most visible slots.
  const order = [3, 2, 4, 1, 5, 0, 6];
  const content: ReactNode[] = new Array(SLOTS.length);
  let s = 0;
  let w = 0;
  for (const i of order) {
    const sample = samples[s];
    if (sample) {
      s += 1;
      content[i] = <VideoTile sample={sample} label={sampleLabel} />;
    } else {
      const triple = words[w % words.length] ?? words[0];
      w += 1;
      content[i] = <AdSketch compact label={illustrationLabel} words={triple} accent={ACCENTS[i]} />;
    }
  }
  return (
    <div className={cn("relative pb-14 max-sm:overflow-x-clip", className)}>
      <div className="stage-glow pointer-events-none absolute inset-x-[10%] inset-y-[-10%]" aria-hidden />
      <ul className="fan relative" aria-label="Examples">
        {SLOTS.map((slot, i) => (
          <li key={i} className={cn("shrink-0", slot.width, slot.show)} style={{ "--r": `${slot.r}deg`, "--y": `${slot.y}px`, "--rise-delay": `${Math.abs(i - 3) * 90}ms` } as CSSProperties}>
            <div>{content[i]}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- stats band: real numbers that count up once in view ---------- */

export type Stat = { value: number; decimals?: number; suffix?: string; label: string };

export function StatsBand({ items, className }: { items: Stat[]; className?: string }) {
  return (
    <Reveal className={className}>
      <dl className="grid gap-px overflow-hidden rounded-card bg-surface-muted sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <div key={f.label} className="bg-surface-muted px-6 py-8 text-center sm:px-8">
            <dd className="text-display text-ink"><CountUp value={f.value} decimals={f.decimals} suffix={f.suffix} duration={1400} /></dd>
            <dt className="mt-1 text-[15px] text-muted">{f.label}</dt>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

/* ---------- alternating feature rows ---------- */

export type FeatureRow = {
  key: string;
  label: string;
  title: string;
  text: string;
  points: string[];
  link: { href: string; label: string };
  icon: LucideIcon;
  panel: ReactNode;
};

export function FeatureRows({ rows, className }: { rows: FeatureRow[]; className?: string }) {
  return (
    <div className={cn("space-y-16 sm:space-y-24", className)}>
      {rows.map((row, i) => {
        const Icon = row.icon;
        const flip = i % 2 === 1;
        return (
          <Reveal key={row.key} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className={cn(flip && "lg:order-2")}>
              <p className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[10px] bg-accent-soft text-accent"><Icon className="size-[18px]" aria-hidden /></span>
                <span className="label-mono text-muted">{row.label}</span>
              </p>
              <h3 className="mt-5 text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">{row.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">{row.text}</p>
              <ul className="mt-5 space-y-2 text-[15px] text-ink/85">
                {row.points.map((p) => <li key={p} className="flex items-start gap-2.5"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{p}</li>)}
              </ul>
              <Button href={row.link.href} variant="primary" className="mt-7">{row.link.label} <ArrowRight className="size-4" aria-hidden /></Button>
            </div>
            <div className={cn("stage-panel relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-card shadow-card sm:min-h-[440px]", flip && "lg:order-1")}>
              {row.panel}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/** One line in two languages behind the translated video: the "translate a video" panel. */
export function TranslatePanel({ label, sampleLabel, placeholder, lines, from, to }: { label: string; sampleLabel: string; placeholder: string; lines: [string, string]; from: string; to: string }) {
  const sample = resolvedExamples("translate")[0];
  return (
    <div className="relative flex items-center justify-center px-6 py-10" aria-hidden>
      <TranslateSketch label={label} from={from} to={to} lines={lines} className="tilt-left absolute left-[4%] top-[10%] hidden w-[210px] opacity-95 md:block" />
      <div className="relative w-[170px] sm:w-[200px]">
        {sample ? <VideoTile sample={sample} label={sampleLabel} /> : <AdSketch compact label={placeholder} words={[lines[0], lines[1], lines[1]]} accent="var(--gold-light)" />}
      </div>
    </div>
  );
}

/* ---------- the row of choices ---------- */

const CHOICE_ICONS: LucideIcon[] = [Clock3, UserRound, Languages, Mic, AudioLines, Gauge, Smile, Tag, Compass, ImageIcon, Captions, Palette, Stamp, Smartphone, FileCheck];

export function ChoicesChips({ eyebrow, title, text, items, className }: { eyebrow: string; title: string; text: string; items: string[]; className?: string }) {
  return (
    <Reveal as="section" className={className}>
      <SectionIntro eyebrow={eyebrow} title={title} text={text} />
      <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2.5">
        {items.map((x, i) => {
          const Icon = CHOICE_ICONS[i % CHOICE_ICONS.length];
          return (
            <li key={x} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-medium text-ink shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-card">
              <Icon className="size-4 text-accent" aria-hidden />
              {x}
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
