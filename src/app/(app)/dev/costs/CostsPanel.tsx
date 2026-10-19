"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type Entry = {
  id: string; startedAt: string; finishedAt: string | null; service: string; action: string; step: string | null; language: string | null;
  setting: string; estimatedUsd: number; actualUsd: number | null; chargedUsd: number; status: string; basis: string; basisLabel: string; isRetry: boolean; attempt: number | null; dashboard: string;
};
type Run = {
  key: string; projectId: string | null; name: string; workflow: string; projectStatus: string; createdAt: string; languages: number;
  budgetUsd: number; budgetLabel: string; estimatedUsd: number; actualUsd: number; chargedUsd: number; entries: Entry[]; byLanguage: { language: string; chargedUsd: number }[];
};
type Report = {
  generatedAt: string;
  limits: { maxPerActionUsd: number; maxPerCreativeUsd: number };
  totals: { todayUsd: number; weekUsd: number; allTimeUsd: number; byService: { service: string; label: string; todayUsd: number; weekUsd: number; allTimeUsd: number; listOnlyUsd: number; dashboard: string; actualsVia: string }[] };
  runs: Run[];
};
type FalRow = { endpoint: string; recordedUsd: number; billedUsd: number; unit: string | null; quantity: number; diffUsd: number };

const usd = (n: number | null | undefined) => (n === null || n === undefined ? "–" : `$${n.toFixed(2)}`);
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const basisTone: Record<string, "success" | "warning" | "neutral" | "danger" | "accent"> = {
  balance: "success",
  tokens: "success",
  provider: "success",
  list: "warning",
  pending: "accent",
  "not charged": "neutral",
};

export function CostsPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [fal, setFal] = useState<{ period: string; rows: FalRow[] } | null>(null);
  const [falError, setFalError] = useState<string | null>(null);
  const [falLoading, setFalLoading] = useState(false);

  const load = useCallback(() => {
    return fetch("/api/dev/costs", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        return b as Report;
      })
      .then((r) => {
        setReport(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncFal(period: "today" | "week") {
    setFalLoading(true);
    setFalError(null);
    try {
      const r = await fetch(`/api/dev/costs/fal?period=${period}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
      setFal(b);
    } catch (e) {
      setFalError((e as Error).message);
    } finally {
      setFalLoading(false);
    }
  }

  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
  if (!report) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-8">
      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Today", report.totals.todayUsd],
          ["This week (from Monday)", report.totals.weekUsd],
          ["All time", report.totals.allTimeUsd],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="pt-5 sm:pt-7">
              <p className="label-mono text-muted">{label as string}</p>
              <p className="mt-1 text-3xl font-semibold text-ink">{usd(value as number)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per service */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Per service</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="size-4" aria-hidden /></Button>
            <Button size="sm" variant="secondary" href="/api/dev/costs/export"><Download className="size-4" aria-hidden />Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="label-mono text-left text-muted">
                <th className="pb-2 pr-3 font-normal">Service</th>
                <th className="pb-2 pr-3 text-right font-normal">Today</th>
                <th className="pb-2 pr-3 text-right font-normal">Week</th>
                <th className="pb-2 pr-3 text-right font-normal">All time</th>
                <th className="pb-2 pr-3 text-right font-normal">Of which list price only</th>
                <th className="pb-2 pr-3 font-normal">Actuals via</th>
              </tr>
            </thead>
            <tbody>
              {report.totals.byService.map((s) => (
                <tr key={s.service} className="border-t border-divider align-top">
                  <td className="py-2 pr-3 font-medium text-ink">
                    <a href={s.dashboard} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-border underline-offset-4 hover:decoration-ink">
                      {s.label}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </td>
                  <td className="py-2 pr-3 text-right">{usd(s.todayUsd)}</td>
                  <td className="py-2 pr-3 text-right">{usd(s.weekUsd)}</td>
                  <td className="py-2 pr-3 text-right">{usd(s.allTimeUsd)}</td>
                  <td className="py-2 pr-3 text-right">{s.listOnlyUsd > 0 ? <Badge tone="warning">{usd(s.listOnlyUsd)}</Badge> : <span className="text-muted">–</span>}</td>
                  <td className="py-2 pr-3 text-[13px] text-muted">{s.actualsVia}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[13px] text-muted">
            Limits: {usd(report.limits.maxPerActionUsd)} per call · {usd(report.limits.maxPerCreativeUsd)} per video (per language version in Workflow B). Report generated {when(report.generatedAt)}.
          </p>
        </CardContent>
      </Card>

      {/* fal.ai reconciliation */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Check fal.ai against its usage API</CardTitle>
            <p className="mt-1 text-[15px] text-muted">fal.ai reports billed totals per model for a period (not per call). Compare them with what we recorded at list price.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => syncFal("today")} disabled={falLoading}>Today</Button>
            <Button size="sm" variant="secondary" onClick={() => syncFal("week")} disabled={falLoading}>This week</Button>
          </div>
        </CardHeader>
        <CardContent>
          {falError && <p role="alert" className="text-sm text-danger">{falError}</p>}
          {fal && fal.rows.length === 0 && <p className="text-sm text-muted">No fal.ai usage in this period, on either side.</p>}
          {fal && fal.rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="label-mono text-left text-muted">
                  <th className="pb-2 pr-3 font-normal">Endpoint</th>
                  <th className="pb-2 pr-3 text-right font-normal">We recorded</th>
                  <th className="pb-2 pr-3 text-right font-normal">fal.ai billed</th>
                  <th className="pb-2 pr-3 text-right font-normal">Quantity</th>
                  <th className="pb-2 pr-3 text-right font-normal">Difference</th>
                </tr>
              </thead>
              <tbody>
                {fal.rows.map((r) => (
                  <tr key={r.endpoint} className="border-t border-divider">
                    <td className="py-2 pr-3 font-mono text-[12px] text-ink">{r.endpoint}</td>
                    <td className="py-2 pr-3 text-right">{usd(r.recordedUsd)}</td>
                    <td className="py-2 pr-3 text-right">{usd(r.billedUsd)}</td>
                    <td className="py-2 text-right text-muted">{r.quantity} {r.unit ?? ""}</td>
                    <td className={cn("py-2 text-right font-medium", Math.abs(r.diffUsd) > 0.01 ? "text-danger" : "text-success")}>{r.diffUsd > 0 ? "+" : ""}{usd(r.diffUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!fal && !falError && <p className="text-sm text-muted">Shotstack has no usage API; its rows stay at list price. HeyGen actuals come from the wallet balance on the test pages.</p>}
        </CardContent>
      </Card>

      {/* Runs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-ink">Per run</h2>
        {report.runs.length === 0 && <p className="text-sm text-muted">No paid calls recorded yet.</p>}
        {report.runs.map((run) => {
          const isOpen = open[run.key] ?? false;
          const perCreative = run.workflow === "translate" ? Math.max(0, ...run.byLanguage.map((l) => l.chargedUsd), 0) : run.chargedUsd;
          const overBudget = run.workflow !== "test" && perCreative > run.budgetUsd + 0.001;
          return (
            <Card key={run.key}>
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [run.key]: !isOpen }))} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-7">
                {isOpen ? <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {run.name}
                    {run.projectId && <span className="label-mono ml-2 text-muted">{run.projectId.slice(0, 8)}</span>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {run.workflow === "ad" ? "Ad from a product photo" : run.workflow === "translate" ? `Translation · ${run.languages} language${run.languages === 1 ? "" : "s"}` : "Developer test pages"} · {when(run.createdAt)} · status {run.projectStatus} · budget {run.budgetLabel}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm text-ink">estimated {usd(run.estimatedUsd)} · actual {usd(run.actualUsd)}</p>
                  <p className="text-[13px] text-muted">counts as {usd(run.chargedUsd)} · {run.entries.length} call{run.entries.length === 1 ? "" : "s"}</p>
                </div>
                <Badge tone={overBudget ? "danger" : run.workflow === "test" ? "neutral" : "success"}>{overBudget ? "over budget" : run.workflow === "test" ? "no budget" : "within budget"}</Badge>
              </button>
              {isOpen && (
                <CardContent className="space-y-4 border-t border-divider pt-4">
                  {run.byLanguage.length > 0 && (
                    <p className="text-[13px] text-muted">Per language version: {run.byLanguage.map((l) => `${l.language.toUpperCase()} ${usd(l.chargedUsd)}`).join(" · ")} (shared costs not included)</p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="label-mono text-left text-muted">
                          <th className="pb-2 pr-3 font-normal">When</th>
                          <th className="pb-2 pr-3 font-normal">Step</th>
                          <th className="pb-2 pr-3 font-normal">Service</th>
                          <th className="pb-2 pr-3 font-normal">Model and setting</th>
                          <th className="pb-2 pr-3 text-right font-normal">Estimated</th>
                          <th className="pb-2 pr-3 text-right font-normal">Actual</th>
                          <th className="pb-2 pr-3 font-normal">Determined by</th>
                          <th className="pb-2 pr-3 font-normal">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.entries.map((e) => (
                          <tr key={e.id} className={cn("border-t border-divider align-top", e.status === "failed" && "text-muted")}>
                            <td className="py-2 pr-3 whitespace-nowrap">{when(e.startedAt)}</td>
                            <td className="py-2 pr-3">{e.step ?? <span className="text-muted">{e.action}</span>}{e.language ? <span className="label-mono ml-1 text-muted">{e.language}</span> : null}</td>
                            <td className="py-2 pr-3">
                              <a href={e.dashboard} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:decoration-ink">{e.service}</a>
                            </td>
                            <td className="py-2 pr-3">{e.setting}</td>
                            <td className="py-2 pr-3 text-right">{usd(e.estimatedUsd)}</td>
                            <td className="py-2 pr-3 text-right font-medium text-ink">{usd(e.actualUsd)}</td>
                            <td className="py-2 pr-3">
                              <Badge tone={basisTone[e.basis] ?? "neutral"}>{e.basis}</Badge>
                              <span className="ml-2 text-[12px] text-muted">{e.basisLabel}</span>
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {e.status === "failed" ? <Badge tone="danger">failed</Badge> : e.status === "started" ? <Badge tone="accent">running</Badge> : <Badge tone="success">done</Badge>}
                              {e.isRetry && <Badge tone="warning" className="ml-1">retry #{e.attempt}</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
