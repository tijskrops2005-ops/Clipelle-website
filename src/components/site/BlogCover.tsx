import { cn } from "@/lib/utils";

/**
 * Own-design cover for an article (23 Nov 2026): one typographic mark per category on a tinted
 * panel, built from the tokens only. It replaces the black phone with a two-letter code, which read
 * as a missing image. No photos from anywhere; CSS only, so it never shifts the layout.
 * Gold sits on ink only (brand rule), so the translation cover is the one dark tile.
 */
const COVERS: Record<string, { panel: string; mark: string; markClass: string; line: string; lineClass: string }> = {
  translation: { panel: "bg-ink", mark: "EN → NL", markClass: "text-champagne", line: "same voice, new language", lineClass: "text-surface/60" },
  "captions-and-formats": { panel: "bg-surface-muted", mark: "9:16", markClass: "text-ink", line: "the only text on screen", lineClass: "text-muted" },
  "scripts-and-hooks": { panel: "bg-accent-soft", mark: "“hook”", markClass: "text-accent", line: "said, not shown", lineClass: "text-ink/60" },
  "product-video": { panel: "bg-warning/10", mark: "photo → video", markClass: "text-ink", line: "from one product photo", lineClass: "text-ink/60" },
  "costs-and-process": { panel: "bg-success/10", mark: "1 · 2 · 3", markClass: "text-ink", line: "plan, test, check", lineClass: "text-ink/60" },
};

export function BlogCover({ category, className }: { category: string; className?: string }) {
  const c = COVERS[category] ?? COVERS["captions-and-formats"];
  return (
    <div className={cn("relative flex flex-col justify-end overflow-hidden p-5", c.panel, className)} aria-hidden>
      <span className={cn("text-[clamp(1.6rem,3.4vw,2.25rem)] font-semibold leading-none tracking-[-0.04em]", c.markClass)}>{c.mark}</span>
      <span className={cn("label-mono mt-2.5", c.lineClass)}>{c.line}</span>
    </div>
  );
}
