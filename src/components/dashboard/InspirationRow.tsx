import { Clapperboard } from "lucide-react";
import { mockInspiration, type InspirationExample } from "@/lib/mock/usage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

/* Tints are derived from design tokens — no hex values in components. */
const tints: Record<InspirationExample["tint"], string> = {
  warm: "from-accent/20 to-accent/5",
  cool: "from-ink/15 to-ink/5",
  sand: "from-warning/20 to-warning/5",
  mint: "from-success/20 to-success/5",
  rose: "from-danger/15 to-danger/5",
  slate: "from-muted/25 to-muted/5",
};

/** A row of example formats. Placeholders only — clearly labelled, no real footage. */
export function InspirationRow() {
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Inspiration</h2>
          <p className="mt-1.5 text-[15px] text-muted">
            Formats that work well for product ads.
          </p>
        </div>
        <Badge tone="warning">Demo placeholders</Badge>
      </div>

      <div className="grid grid-cols-3 gap-5 sm:grid-cols-6">
        {mockInspiration.map((example) => (
          <div
            key={example.id}
            className={cn(
              "relative aspect-[9/16] overflow-hidden rounded-tile bg-gradient-to-b shadow-card",
              tints[example.tint],
            )}
          >
            <Clapperboard
              className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-ink/25"
              aria-hidden
            />
            <div className="absolute inset-x-3 bottom-3">
              <p className="text-sm font-semibold text-ink">{example.title}</p>
              <p className="label-mono mt-1 text-muted">{example.format}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
