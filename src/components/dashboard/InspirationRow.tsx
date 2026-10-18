import { Clapperboard } from "lucide-react";
import { mockInspiration, type InspirationExample } from "@/lib/mock/usage";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/PageHeader";
import { DemoBadge } from "@/components/DemoModeBadge";

/* Tints are derived from design tokens — no hex values in components. */
const tints: Record<InspirationExample["tint"], string> = {
  warm: "from-accent/25 via-accent/10 to-surface-muted",
  cool: "from-ink/15 via-ink/5 to-surface-muted",
  sand: "from-warning/25 via-warning/10 to-surface-muted",
  mint: "from-success/20 via-success/8 to-surface-muted",
  rose: "from-danger/15 via-danger/5 to-surface-muted",
  slate: "from-muted/30 via-muted/10 to-surface-muted",
};

/** A row of example formats. Placeholders only — clearly labelled, no real footage. */
export function InspirationRow() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Inspiration"
        description="Formats that work well for product ads."
        aside={<DemoBadge className="shrink-0">Demo placeholders</DemoBadge>}
      />

      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {mockInspiration.map((example) => (
          <div
            key={example.id}
            className={cn(
              "relative aspect-[9/16] w-[136px] shrink-0 snap-start overflow-hidden rounded-tile bg-gradient-to-b shadow-card",
              tints[example.tint],
            )}
          >
            <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-surface/90 text-ink shadow-card">
              <Clapperboard className="size-4" aria-hidden />
            </span>
            <div className="absolute inset-x-3 bottom-3 space-y-1">
              <p className="text-sm font-semibold leading-tight text-ink">
                {example.title}
              </p>
              <p className="label-mono leading-[1.3] text-muted">{example.format}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
