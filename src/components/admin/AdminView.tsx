"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { getAdminStats } from "@/lib/admin";
import { formatUsd } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Stats = Awaited<ReturnType<typeof getAdminStats>>;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="label-mono text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-semibold text-ink">{value}</p>
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

const minutes = (s: number | null) => (s === null ? "—" : `${Math.round(s / 60)} min`);

export function AdminView({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(id: string, action: "retry" | "cancel") {
    setBusy(`${id}:${action}`);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/projects/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = (await r.json()) as { ok: boolean; error?: string };
      setMsg(body.ok ? `${action === "retry" ? "Restarted" : "Cancelled"} ${id.slice(0, 8)}.` : (body.error ?? "Failed."));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const total = (f: (r: Stats["projectsByStatus"][number]) => boolean) => stats.projectsByStatus.filter(f).reduce((s, r) => s + r.n, 0);
  return (
    <div className="space-y-10">
      <PageHeader
        title="Admin"
        badge={<Badge tone="warning" className="translate-y-1">Administrators only</Badge>}
        description={`Aggregates since ${formatDate(stats.since)}. Read-only, except Retry and Cancel on stuck projects. No customer content is shown here.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button href="/admin/quality" variant="secondary" size="sm">Quality reports</Button>
            <SegmentedControl label="Period" size="sm" options={[{ key: "day", label: "Today" }, { key: "week", label: "7 days" }, { key: "month", label: "30 days" }]} value={stats.period} onChange={(p) => router.push(`/admin?period=${p}`)} />
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={stats.users} hint={`${stats.workspaces} workspaces`} />
        <Stat label="Free ads today" value={`${stats.freeAds.today} / ${stats.freeAds.cap}`} hint="FREE_ADS_PER_DAY" />
        <Stat label="Projects in period" value={total(() => true)} hint={`${total((r) => r.status === "completed")} completed · ${total((r) => r.status === "failed")} failed · ${total((r) => r.status === "processing" || r.status === "review")} running`} />
        <Stat label="Real cost" value={formatUsd(stats.money.costUsd)} hint={`credits used ${stats.money.creditsUsed} (≈ ${formatUsd(stats.money.creditsUsedUsd)} at cost) · sold ${stats.money.creditsSold}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sign-ups per day (30 days)</CardTitle></CardHeader>
          <CardContent>
            {stats.signupsPerDay.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
              <ul className="grid grid-cols-2 gap-1 text-[13px] sm:grid-cols-3">
                {stats.signupsPerDay.map((s) => <li key={s.day} className="flex justify-between border-b border-divider py-1"><span className="text-muted">{s.day}</span><span className="font-medium text-ink">{s.n}</span></li>)}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Per workflow (period)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-[13px]">
              <thead className="text-muted"><tr><th className="py-1 font-medium">Workflow</th><th className="py-1 font-medium">Finished</th><th className="py-1 font-medium">Failed</th><th className="py-1 font-medium">Failure rate</th><th className="py-1 font-medium">Avg time</th></tr></thead>
              <tbody>
                {stats.perWorkflow.map((w) => (
                  <tr key={w.workflow} className="border-t border-divider"><td className="py-1.5 capitalize">{w.workflow === "ad" ? "Ads" : "Translations"}</td><td>{w.finished}</td><td>{w.failed}</td><td>{w.failureRate === null ? "—" : `${Math.round(w.failureRate * 100)}%`}</td><td>{minutes(w.avgSeconds)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Margin per plan (30 days, indication)</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-[13px] text-muted">Revenue = workspaces on the plan × the monthly price; cost = provider spend of their projects in the last 30 days. Packs and annual billing are not split out here.</p>
          <table className="w-full text-left text-[13px]">
            <thead className="text-muted"><tr><th className="py-1 font-medium">Plan</th><th className="py-1 font-medium">Workspaces</th><th className="py-1 font-medium">Monthly revenue</th><th className="py-1 font-medium">Cost 30 d</th><th className="py-1 font-medium">Margin</th></tr></thead>
            <tbody>
              {stats.money.marginPerPlan.map((m) => (
                <tr key={m.planKey} className="border-t border-divider"><td className="py-1.5">{m.planKey}</td><td>{m.workspaces}</td><td>{formatUsd(m.monthlyRevenueUsd)}</td><td>{formatUsd(m.costUsd30d)}</td><td>{m.marginPct === null ? "—" : `${m.marginPct}%`}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Most expensive projects (period)</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-[13px]">
              {stats.expensive.map((e) => (
                <li key={e.projectId ?? e.name} className="flex items-center justify-between gap-3 border-b border-divider py-1.5">
                  <span className="min-w-0 truncate">{e.projectId ? <Link href={`/projects/${e.projectId}`} className="underline-offset-2 hover:underline">{e.name}</Link> : e.name} <span className="text-muted">· {e.workflow}</span></span>
                  <span className="flex items-center gap-2"><StatusBadge status={e.status} /><span className="font-medium">{formatUsd(e.usd)}</span></span>
                </li>
              ))}
              {stats.expensive.length === 0 && <li className="text-muted">No paid calls in this period.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stuck projects (no change for 30 min)</CardTitle></CardHeader>
          <CardContent>
            {msg && <p role="status" className="mb-2 text-[13px] text-muted">{msg}</p>}
            <ul className="space-y-1 text-[13px]">
              {stats.stuck.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-divider py-1.5">
                  <span className="min-w-0 truncate">{s.name} <span className="text-muted">· {s.workflow} · since {formatDate(s.updatedAt)}</span></span>
                  <span className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => act(s.id, "retry")} disabled={busy !== null}>{busy === `${s.id}:retry` ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}Retry</Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => act(s.id, "cancel")} disabled={busy !== null}>Cancel</Button>
                  </span>
                </li>
              ))}
              {stats.stuck.length === 0 && <li className="text-muted">Nothing is stuck.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Rate-limit windows" value={stats.rateLimits.keys} hint={`${stats.rateLimits.hits} hits in period (keys are hashes)`} />
        <Stat label="Demo and contact requests" value={stats.requests.demo} />
        <Stat label="Waitlist sign-ups" value={stats.requests.waitlist} hint={stats.waitlistByFeature.map((w) => `${w.feature}: ${w.n}`).join(" · ") || "none"} />
        <Stat label="Service and career requests" value={`${stats.requests.service} · ${stats.requests.careers}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Latest demo and contact requests</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-[13px]">
              {stats.recentDemo.map((r) => <li key={r.id} className="flex justify-between gap-3 border-b border-divider py-1.5"><span className="min-w-0 truncate">{r.name} · {r.email}{r.company ? ` · ${r.company}` : ""} · {r.kind}</span><span className="shrink-0 text-muted">{r.status} · {formatDate(r.createdAt)}</span></li>)}
              {stats.recentDemo.length === 0 && <li className="text-muted">None.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest service requests</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-[13px]">
              {stats.recentService.map((r) => <li key={r.id} className="flex justify-between gap-3 border-b border-divider py-1.5"><span className="min-w-0 truncate">{r.name} · {r.email}{r.company ? ` · ${r.company}` : ""}{r.adsPerMonth ? ` · ${r.adsPerMonth}/mo` : ""}</span><span className="shrink-0 text-muted">{r.status} · {formatDate(r.createdAt)}</span></li>)}
              {stats.recentService.length === 0 && <li className="text-muted">None.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
