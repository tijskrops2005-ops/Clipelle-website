import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export type SummaryRow = { label: ReactNode; value: ReactNode; muted?: boolean };

/**
 * The fixed summary next to a form: what was chosen, what it costs, the main button.
 * Sticky from xl; on narrower screens it sits under the form as the last card.
 */
export function SummaryPanel({ title = "Summary", rows, total, children, footnote, className }: { title?: ReactNode; rows: SummaryRow[]; total?: { label: ReactNode; value: ReactNode; tone?: "neutral" | "danger"; note?: ReactNode }; children?: ReactNode; footnote?: ReactNode; className?: string }) {
  return (
    <Card className={cn("xl:sticky xl:top-6", className)}>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="label-mono text-muted">{title}</p>
        <dl className="mt-4 space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 text-sm">
              <dt className="shrink-0 text-muted">{r.label}</dt>
              <dd className={cn("truncate text-right font-medium text-ink", r.muted && "font-normal text-muted")}>{r.value}</dd>
            </div>
          ))}
        </dl>
        {total && (
          <div className={cn("mt-5 rounded-panel px-4 py-3.5", total.tone === "danger" ? "bg-danger/10" : "bg-surface-muted")}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted">{total.label}</span>
              <span className={cn("text-[26px] font-semibold leading-none tracking-[-0.02em]", total.tone === "danger" ? "text-danger" : "text-ink")}>{total.value}</span>
            </div>
            {total.note && <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{total.note}</p>}
          </div>
        )}
      </div>
      {children && <div className="space-y-3 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">{children}</div>}
      {footnote && <p className="border-t border-divider px-5 py-3.5 text-[13px] leading-relaxed text-muted sm:px-6">{footnote}</p>}
    </Card>
  );
}
