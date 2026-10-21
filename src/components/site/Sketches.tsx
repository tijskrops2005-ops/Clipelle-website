import { Download, MousePointerClick, Sparkles, UploadCloud } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

/**
 * Illustrated stand-ins for the marketing site, drawn with CSS and tokens only (no footage, no
 * photos of people): a 9:16 ad with a presenter silhouette, the product card and cycling captions;
 * the translation of one line; the pipeline strip. Each one is labelled as an illustration so it
 * is never mistaken for output. All motion is CSS and stops under "reduce motion".
 */

export function AdSketch({ className, label = "Illustration", words = ["Tired of dull skin?", "Meet Glow.", "Brighter in two weeks."], accent = "var(--accent)", compact = false }: { className?: string; label?: string; words?: string[]; accent?: string; compact?: boolean }) {
  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-ink bg-ink shadow-card-hover", className)} aria-hidden>
      {/* backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#3a3a44_0%,#16161a_60%,#0b0b0d_100%)]" />
      {/* presenter silhouette */}
      <svg viewBox="0 0 180 320" className="absolute inset-x-0 bottom-0 h-[78%] w-full" fill="none">
        <ellipse cx="90" cy="330" rx="86" ry="90" fill="#2a2a32" />
        <path d="M44 330c0-46 20-78 46-78s46 32 46 78" fill="#3b3b46" />
        <circle cx="90" cy="112" r="42" fill="#d9c2b0" />
        <path d="M48 104c0-30 18-52 42-52s42 22 42 52c0 6-2 9-6 9-5-16-19-24-36-24s-31 8-36 24c-4 0-6-3-6-9z" fill="#2b2320" />
        <rect x="68" y="150" width="44" height="26" rx="12" fill="#d9c2b0" />
      </svg>
      {/* product card overlay */}
      <div className="absolute right-3 top-14 w-[38%] rounded-[12px] bg-surface p-1.5 shadow-card">
        <div className="aspect-[3/4] rounded-[8px] bg-[linear-gradient(160deg,#f1e8dd,#d7c6b2)]">
          <div className="mx-auto mt-[22%] h-[55%] w-[42%] rounded-[6px] bg-[linear-gradient(180deg,#1f3a5f,#13263f)]" />
        </div>
      </div>
      {/* waveform */}
      <div className="wave absolute left-4 top-16 flex h-5 items-center gap-[3px] text-surface/80"><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /></div>
      {/* captions */}
      <div className={cn("word-cycle absolute inset-x-3 text-center font-bold uppercase leading-tight text-white", compact ? "bottom-10 h-10 text-[13px]" : "bottom-14 h-14 text-[17px]")}>
        {words.map((w, i) => (
          <span key={i} className="flex items-end justify-center">
            <span className="rounded-[8px] bg-black/55 px-2 py-1" style={i === 1 ? { color: accent } : undefined}>{w}</span>
          </span>
        ))}
      </div>
      {/* progress */}
      <div className="absolute inset-x-5 bottom-5 h-1 rounded-full bg-white/20"><div className="playhead absolute -top-1 size-3 rounded-full bg-white shadow" /></div>
      <span className="label-mono absolute left-3 top-3 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] text-ink">{label}</span>
    </div>
  );
}

export function TranslateSketch({ className, from = "EN", to = "NL", lines = ["Keeps drinks cold all day.", "Houdt drinken de hele dag koud."], label = "Illustration" }: { className?: string; from?: string; to?: string; lines?: [string, string]; label?: string }) {
  return (
    <div className={cn("relative w-[240px] rounded-card bg-surface p-4 shadow-card", className)} aria-hidden>
      <div className="flex items-center justify-between">
        <span className="label-mono text-muted">{label}</span>
        <span className="label-mono rounded-full bg-ink px-2 py-0.5 text-surface">{from} → {to}</span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="rounded-[10px] bg-surface-muted p-3 text-[12px] leading-snug text-muted line-through decoration-muted/60">{lines[0]}</div>
        <div className="relative rounded-[10px] bg-ink p-3 text-[12px] font-medium leading-snug text-surface">
          {lines[1]}
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-success text-[10px] text-white">✓</span>
        </div>
      </div>
      <div className="wave mt-4 flex h-4 items-center gap-[3px] text-ink/70"><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /><i className="h-full" /></div>
      <p className="mt-2 text-[11px] text-muted">Checked line by line · lips matched</p>
    </div>
  );
}

const STEPS = ["Script", "Product clip", "Presenter", "Final edit"];

/** The four steps with a flowing dashed line between them: one glance at what happens after the click. */
export function PipelineStrip({ labels = STEPS, className }: { labels?: string[]; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-between gap-2 rounded-card bg-surface px-4 py-3 shadow-card sm:px-6", className)} aria-label={labels.join(" → ")}>
      <div className="dash-line pointer-events-none absolute inset-x-10 top-1/2 h-0.5 -translate-y-1/2" aria-hidden />
      {labels.map((l, i) => (
        <div key={l} className="relative flex items-center gap-2 rounded-full bg-surface px-1">
          <span className="grid size-7 place-items-center rounded-full bg-ink text-[12px] font-semibold text-surface">{i + 1}</span>
          <span className="hidden text-[13px] font-medium text-ink sm:inline">{l}</span>
        </div>
      ))}
    </div>
  );
}

/** "Three things on your side": icon, number, title and a line, with a connector between the cards. */
export function ThreeSteps({ items, className }: { items: { title: React.ReactNode; text?: React.ReactNode }[]; className?: string }) {
  const icons = [UploadCloud, MousePointerClick, Download];
  return (
    <ol className={cn("relative grid gap-4 sm:grid-cols-3", className)}>
      {items.map((item, i) => {
        const Icon = icons[i] ?? Sparkles;
        return (
          <Reveal as="li" key={i} delay={i * 90} className="group relative flex flex-col gap-3 rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--surface),var(--accent-soft))] text-accent ring-1 ring-accent/15 transition-transform duration-200 group-hover:scale-105"><Icon className="size-5" aria-hidden /></span>
              <span className="label-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="text-[17px] font-semibold text-ink">{item.title}</h3>
            {item.text && <p className="text-[15px] leading-relaxed text-muted">{item.text}</p>}
            {i < items.length - 1 && <span className="dash-line absolute -right-4 top-1/2 hidden h-0.5 w-4 sm:block" aria-hidden />}
          </Reveal>
        );
      })}
    </ol>
  );
}

/** Three factual check-chips under a hero. */
export function ProofChips({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((x) => (
        <li key={x} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[13px] text-ink/85 shadow-soft">
          <span className="grid size-4 place-items-center rounded-full bg-success/15 text-[10px] font-bold text-success">✓</span>
          {x}
        </li>
      ))}
    </ul>
  );
}

/** The hero phone with two illustrated cards tilted behind it, on soft colour fields. */
export function HeroStage({ children, className, variant = "ads", label = "Illustration" }: { children: React.ReactNode; className?: string; variant?: "ads" | "translate"; label?: string }) {
  return (
    <div className={cn("relative mx-auto flex h-[560px] w-full max-w-[520px] items-center justify-center", className)}>
      <div className="glow-field accent left-[-10%] top-[10%] h-72 w-72" />
      <div className="glow-field warm bottom-[0%] right-[-8%] h-64 w-64" />
      {variant === "ads" ? (
        <>
          <div className="absolute left-[-4%] top-[10%] hidden w-[150px] sm:block"><AdSketch compact label={label} className="tilt-left opacity-95" words={["This just arrived…", "Trail Bottle.", "Cold all day."]} /></div>
          <div className="absolute right-[-4%] top-[20%] hidden w-[150px] sm:block"><AdSketch compact label={label} className="tilt-right opacity-95" words={["Three reasons…", "One: it lasts.", "Tap to shop."]} accent="var(--warning)" /></div>
        </>
      ) : (
        <>
          <div className="absolute left-[-10%] top-[12%] hidden sm:block"><TranslateSketch label={label} className="tilt-left w-[200px] opacity-95" from="EN" to="DE" lines={["Keeps drinks cold all day.", "Hält Getränke den ganzen Tag kalt."]} /></div>
          <div className="absolute bottom-[10%] right-[-10%] hidden sm:block"><TranslateSketch label={label} className="tilt-right w-[200px] opacity-95" from="EN" to="FR" lines={["Keeps drinks cold all day.", "Garde vos boissons fraîches toute la journée."]} /></div>
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
