import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A circular meter that draws itself once on load (CSS only, static under "reduce motion"). */
export function ProgressRing({ value, size = 64, stroke = 6, className, children, label }: { value: number; size?: number; stroke?: number; className?: string; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - clamped)}
          className="ring-draw"
          style={{ "--ring-len": `${len}` } as CSSProperties}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
