"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";

type Entry = { id: string; service: string; action: string; estimatedUsd: number; actualUsd: number | null; status: string; startedAt: string };
type Summary = {
  day: string;
  spentTodayUsd: number;
  actionsToday: number;
  maxPerActionUsd: number;
  maxPerCreativeUsd: number;
  recent: Entry[];
};

const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Shows today's spend across all paid services and the two limits (per action, per creative).
 * Re-fetches when `refreshKey` changes (pages bump it after a paid action settles).
 */
export function SpendMeter({ refreshKey = 0, className }: { refreshKey?: number; className?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/dev/cost")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        return b as Summary;
      })
      .then((s) => { setSummary(s); setError(null); })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const pct = summary ? Math.min(100, Math.round((summary.spentTodayUsd / Math.max(0.01, summary.maxPerCreativeUsd * 5)) * 100)) : 0;
  const tone = pct >= 90 ? "bg-danger" : pct >= 60 ? "bg-warning" : "bg-success";

  return (
    <Card className={className}>
      <CardContent className="pt-5 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-surface-muted text-ink"><Wallet className="size-4" aria-hidden /></span>
            <div>
              <p className="label-mono text-muted">Spend today · all services</p>
              {summary ? (
                <p className="text-lg font-semibold text-ink">
                  {usd(summary.spentTodayUsd)} <span className="text-sm font-normal text-muted">today · max {usd(summary.maxPerActionUsd)} per action · max {usd(summary.maxPerCreativeUsd)} per video</span>
                </p>
              ) : (
                <p className="text-sm text-muted">{error ?? "Loading…"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-ink">
              {open ? "Hide log" : `Log (${summary?.actionsToday ?? 0} today)`}
            </button>
            <button type="button" onClick={load} aria-label="Refresh" className="grid size-8 place-items-center rounded-control text-muted hover:bg-ink/5 hover:text-ink">
              <RefreshCw className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
        </div>
        {open && summary && (
          <table className="mt-4 w-full text-[13px]">
            <thead className="label-mono text-muted"><tr className="text-left"><th className="pb-1 font-normal">When</th><th className="pb-1 font-normal">Service</th><th className="pb-1 font-normal">Est.</th><th className="pb-1 font-normal">Actual</th><th className="pb-1 font-normal">Status</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {summary.recent.length === 0 && <tr><td colSpan={5} className="py-2 text-muted">No paid actions logged yet.</td></tr>}
              {summary.recent.map((e) => (
                <tr key={e.id}>
                  <td className="py-1.5 pr-2 text-muted">{new Date(e.startedAt).toLocaleString()}</td>
                  <td className="py-1.5 pr-2 text-ink">{e.service} · {e.action}</td>
                  <td className="py-1.5 pr-2 text-ink">{usd(e.estimatedUsd)}</td>
                  <td className="py-1.5 pr-2 text-ink">{e.actualUsd == null ? "—" : usd(e.actualUsd)}</td>
                  <td className={cn("py-1.5", e.status === "failed" ? "text-danger" : e.status === "completed" ? "text-success" : "text-warning")}>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
