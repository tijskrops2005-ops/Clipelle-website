"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { getAdminStats } from "@/lib/admin";
import { config } from "@/lib/config";
import { formatUsd } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AdminTable, StatCard, Td, Th, Tr } from "./parts";

type Stats = Awaited<ReturnType<typeof getAdminStats>>;

const minutes = (s: number | null) => (s === null ? "—" : `${Math.round(s / 60)} min`);

/** One white card with a short title; the same look as the customer pages (2 Nov 2026). */
function Panel({ title, hint, aside, children }: { title: string; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * /admin overview (cleaned up 2 Nov 2026): one period switch, four numbers, and a few quiet cards.
 * Read-only, except Retry and Cancel on stuck projects. No customer content.
 */
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
  const completed = total((r) => r.status === "completed");
  const failed = total((r) => r.status === "failed");
  const running = total((r) => r.status === "processing" || r.status === "review");
  const signups = stats.signupsPerDay.reduce((s, d) => s + d.n, 0);
  const workflows = config.features.ads ? stats.perWorkflow : stats.perWorkflow.filter((w) => w.workflow !== "ad");
  const requests = [
    ...stats.recentDemo.map((r) => ({ id: r.id, kind: r.kind, who: r.name, email: r.email, company: r.company, status: r.status, at: r.createdAt })),
    ...stats.recentService.map((r) => ({ id: r.id, kind: "service", who: r.name, email: r.email, company: r.company, status: r.status, at: r.createdAt })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description={`Since ${formatDate(stats.since)} · read-only · no customer content.`}
        actions={<SegmentedControl label="Period" size="sm" options={[{ key: "day", label: "Today" }, { key: "week", label: "7 days" }, { key: "month", label: "30 days" }]} value={stats.period} onChange={(p) => router.push(`/admin?period=${p}`)} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users.toLocaleString("en-US")} hint={`${stats.workspaces} workspaces · ${signups} sign-ups in 30 days`} />
        <StatCard label="Projects" value={total(() => true).toLocaleString("en-US")} hint={`${completed} completed · ${failed} failed · ${running} running`} />
        <StatCard label="Real cost" value={formatUsd(stats.money.costUsd)} hint={`${stats.money.creditsUsed.toLocaleString("en-US")} credits used`} />
        <StatCard label="Credits sold" value={stats.money.creditsSold.toLocaleString("en-US")} hint={config.features.ads ? `free ads today ${stats.freeAds.today} / ${stats.freeAds.cap}` : "plans and packs in the period"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Per workflow" hint="Finished and failed in the period, with the average time to ready.">
          <AdminTable minWidth={0} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>Workflow</Th><Th right>Finished</Th><Th right>Failed</Th><Th right>Failure</Th><Th right>Avg time</Th></tr></thead>
            <tbody>
              {workflows.map((w) => (
                <Tr key={w.workflow}><Td>{w.workflow === "ad" ? "Ads" : "Translations"}</Td><Td right>{w.finished}</Td><Td right>{w.failed}</Td><Td right muted>{w.failureRate === null ? "—" : `${Math.round(w.failureRate * 100)}%`}</Td><Td right muted>{minutes(w.avgSeconds)}</Td></Tr>
              ))}
            </tbody>
          </AdminTable>
        </Panel>

        <Panel title="Margin per plan" hint="Workspaces on the plan × the monthly price, against their provider cost of the last 30 days. Packs and annual billing are not split out.">
          <AdminTable minWidth={0} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>Plan</Th><Th right>Workspaces</Th><Th right>Revenue</Th><Th right>Cost 30 d</Th><Th right>Margin</Th></tr></thead>
            <tbody>
              {stats.money.marginPerPlan.map((m) => (
                <Tr key={m.planKey}><Td className="capitalize">{m.planKey}</Td><Td right>{m.workspaces}</Td><Td right>{formatUsd(m.monthlyRevenueUsd)}</Td><Td right muted>{formatUsd(m.costUsd30d)}</Td><Td right>{m.marginPct === null ? "—" : `${m.marginPct}%`}</Td></Tr>
              ))}
            </tbody>
          </AdminTable>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most expensive projects" hint="Provider cost in the period.">
          {stats.expensive.length === 0 ? (
            <p className="text-[13.5px] text-muted">No paid calls in this period.</p>
          ) : (
            <AdminTable minWidth={0} className="p-0 shadow-none sm:p-0">
              <thead><tr><Th>Project</Th><Th>Status</Th><Th right>Cost</Th></tr></thead>
              <tbody>
                {stats.expensive.map((e) => (
                  <Tr key={e.projectId ?? e.name}>
                    <Td><span className="block max-w-[260px] truncate">{e.projectId ? <Link href={`/projects/${e.projectId}`} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{e.name}</Link> : e.name}</span><span className="text-[12px] text-muted">{e.workflow === "ad" ? "ad" : "translation"}</span></Td>
                    <Td><StatusBadge status={e.status} /></Td>
                    <Td right>{formatUsd(e.usd)}</Td>
                  </Tr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </Panel>

        <Panel title="Stuck projects" hint="No change for 30 minutes. Retry starts the failed step again; Cancel refunds the credits." aside={msg ? <span role="status" className="text-[12.5px] text-muted">{msg}</span> : undefined}>
          {stats.stuck.length === 0 ? (
            <p className="text-[13.5px] text-muted">Nothing is stuck.</p>
          ) : (
            <ul className="divide-y divide-divider text-[13.5px]">
              {stats.stuck.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 truncate">{s.name} <span className="text-muted">· {s.workflow === "ad" ? "ad" : "translation"} · since {formatDate(s.updatedAt)}</span></span>
                  <span className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => act(s.id, "retry")} disabled={busy !== null}>{busy === `${s.id}:retry` ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}Retry</Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => act(s.id, "cancel")} disabled={busy !== null}>Cancel</Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Requests" hint={`In the period: ${stats.requests.demo} demo and contact · ${stats.requests.waitlist} waitlist${stats.waitlistByFeature.length ? ` (${stats.waitlistByFeature.map((w) => `${w.feature} ${w.n}`).join(", ")})` : ""} · ${stats.requests.service} service · ${stats.requests.careers} careers · ${stats.rateLimits.hits} rate-limit hits.`}>
        {requests.length === 0 ? (
          <p className="text-[13.5px] text-muted">None yet.</p>
        ) : (
          <AdminTable minWidth={560} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>When</Th><Th>Kind</Th><Th>Who</Th><Th>Status</Th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <Tr key={`${r.kind}-${r.id}`}><Td muted className="whitespace-nowrap">{formatDate(r.at)}</Td><Td>{r.kind}</Td><Td><span className="block">{r.who}</span><span className="text-[12px] text-muted">{r.email}{r.company ? ` · ${r.company}` : ""}</span></Td><Td muted>{r.status}</Td></Tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  );
}
