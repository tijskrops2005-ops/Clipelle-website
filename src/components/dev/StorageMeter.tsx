import { cn } from "@/lib/utils";

export type Usage = {
  usedBytes: number;
  objectCount: number;
  freePlanBytes: number;
  fraction: number;
  byKind: { kind: string; bytes: number; count: number }[];
};

function fmt(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

/** Used storage against the free plan. Server and client safe (no hooks). */
export function StorageMeter({ usage, detailed, className }: { usage: Usage; detailed?: boolean; className?: string }) {
  const pct = Math.round(usage.fraction * 100);
  const tone = usage.fraction > 0.9 ? "bg-danger" : usage.fraction > 0.7 ? "bg-warning" : "bg-success";
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink">
          <span className="text-xl font-semibold">{fmt(usage.usedBytes)}</span> <span className="text-muted">of {fmt(usage.freePlanBytes)} free storage used</span>
        </p>
        <span className="label-mono text-muted">
          {pct}% · {usage.objectCount} {usage.objectCount === 1 ? "file" : "files"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(1, pct)}%` }} />
      </div>
      {detailed && usage.byKind.length > 0 && (
        <ul className="grid gap-1 text-[13px] text-muted sm:grid-cols-2">
          {usage.byKind.map((k) => (
            <li key={k.kind} className="flex justify-between gap-3">
              <span className="font-mono">{k.kind}</span>
              <span>
                {fmt(k.bytes)} · {k.count}
              </span>
            </li>
          ))}
        </ul>
      )}
      {detailed && <p className="text-[13px] text-muted">Running estimate from our bucket. The Supabase dashboard (Reports) is the official number.</p>}
    </div>
  );
}
