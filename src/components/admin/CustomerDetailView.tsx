"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import type { CustomerDetail, LedgerPage } from "@/lib/adminCustomers";
import type { CustomerLimits, LimitCaps } from "@/lib/customerLimits";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/Badge";
import { DemoBadge } from "@/components/DemoModeBadge";
import { cn } from "@/lib/utils";
import { AdminTable, StatCard, Td, Th, Tr, day, money, when } from "./parts";

type Props = { detail: CustomerDetail; ledger: LedgerPage; caps: LimitCaps; demo?: boolean };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!r.ok) {
    const e = new Error(body.error ?? `Request failed (${r.status}).`) as Error & { code?: string; body?: unknown };
    e.code = body.code;
    e.body = body;
    throw e;
  }
  return body;
}

/** /admin/customers/[id] (2 Nov 2026): the customer's facts and every support action, each with its own confirmation. */
export function CustomerDetailView({ detail, ledger: firstLedger, caps, demo }: Props) {
  const { row } = detail;
  const plan = planByKey(row.planKey);
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/admin/customers" className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden />All customers</Link>
        <h1 className="text-display text-ink">{row.name ?? row.email}</h1>
        <p className="text-[15px] text-muted">
          {row.email} · signed up {day(row.signedUpAt)} · last seen {row.lastActiveAt ? day(row.lastActiveAt) : "never"} · 2FA {row.totpEnabled ? "on" : "off"}
          {row.deletionRequestedAt && <span className="text-danger"> · deletion requested {day(row.deletionRequestedAt)}</span>}
          {demo && <> <DemoBadge>Demo</DemoBadge></>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Plan" value={plan?.name ?? row.planKey} hint={row.subscriptionStatus ?? "no subscription"} />
        <StatCard label="Balance" value={<span className={cn(row.balance < 0 && "text-danger")}>{row.balance.toLocaleString("en-US")}</span>} hint="credits" />
        <StatCard label="Paid" value={row.paidCents ? money(row.paidCents) : "—"} hint="including VAT" />
        <StatCard label="Videos" value={detail.videos.toLocaleString("en-US")} hint="completed projects" />
      </div>

      <ViewAsPanel customerId={row.userId} name={row.name ?? row.email} demo={demo} />
      <AdjustCredits customerId={row.userId} balance={row.balance} demo={demo} />
      <LimitsPanel customerId={row.userId} limits={detail.limits} caps={caps} demo={demo} />

      <SectionCard title="Workspaces" description="Where this customer works, with role and members, and the API keys of those workspaces.">
        <AdminTable minWidth={600} className="p-0 shadow-none sm:p-0">
          <thead><tr><Th>Workspace</Th><Th>Role</Th><Th right>Members</Th><Th>Plan</Th><Th>Status</Th><Th>Created</Th></tr></thead>
          <tbody>
            {detail.workspaces.map((w) => (
              <Tr key={w.id}><Td>{w.name} <span className="text-muted">· {w.kind}</span></Td><Td>{w.role}</Td><Td right>{w.members}</Td><Td>{planByKey(w.planKey)?.name ?? w.planKey}</Td><Td>active</Td><Td muted>{day(w.createdAt)}</Td></Tr>
            ))}
          </tbody>
        </AdminTable>
        {detail.apiKeys.length > 0 && (
          <AdminTable minWidth={520} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>API key</Th><Th>Prefix</Th><Th>Last used</Th><Th>Status</Th></tr></thead>
            <tbody>
              {detail.apiKeys.map((k) => (
                <Tr key={k.id}><Td>{k.name}</Td><Td muted className="font-mono">{k.prefix}…</Td><Td muted>{when(k.lastUsedAt)}</Td><Td>{k.revokedAt ? "revoked" : "active"}</Td></Tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </SectionCard>

      <SectionCard title="Purchases" description="Every payment, with the terms version accepted at the time.">
        {detail.purchases.length === 0 ? (
          <p className="text-[14px] text-muted">No purchases yet.</p>
        ) : (
          <AdminTable minWidth={720} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>Date</Th><Th>Item</Th><Th right>Credits</Th><Th right>Amount</Th><Th>Status</Th><Th>Terms</Th></tr></thead>
            <tbody>
              {detail.purchases.map((p) => (
                <Tr key={p.id}><Td muted className="whitespace-nowrap">{day(p.createdAt)}</Td><Td>{p.item}</Td><Td right>{p.credits.toLocaleString("en-US")}</Td><Td right>{money(p.amountCents, p.currency)}</Td><Td>{p.status}</Td><Td muted>{p.termsVersion ? `${p.termsVersion}${p.termsAcceptedAt ? ` · ${when(p.termsAcceptedAt)}` : ""}` : "—"}</Td></Tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </SectionCard>

      <CreditHistory customerId={row.userId} first={firstLedger} demo={demo} />

      <SectionCard title="Projects" description={`${detail.batches} ${detail.batches === 1 ? "batch" : "batches"} · ${detail.projects.filter((p) => p.status === "completed").length} completed · ${detail.projects.filter((p) => p.status === "failed").length} failed`}>
        {detail.projects.length === 0 ? (
          <p className="text-[14px] text-muted">No projects yet.</p>
        ) : (
          <AdminTable minWidth={760} className="p-0 shadow-none sm:p-0">
            <thead><tr><Th>Date</Th><Th>Project</Th><Th>Type</Th><Th>Status</Th><Th right>Credits</Th><Th right>Real cost</Th></tr></thead>
            <tbody>
              {detail.projects.map((p) => (
                <Tr key={p.id}>
                  <Td muted className="whitespace-nowrap">{day(p.createdAt)}</Td>
                  <Td><Link href={`/projects/${p.id}`} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{p.name}</Link></Td>
                  <Td>{p.batchId ? "batch" : p.workflow === "ad" ? "ad" : "translation"}</Td>
                  <Td><StatusBadge status={p.status as "draft" | "processing" | "review" | "completed" | "failed"} /></Td>
                  <Td right>{p.credits.toLocaleString("en-US")}</Td>
                  <Td right muted>${p.realCostUsd.toFixed(2)}</Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        )}
        <p className="text-[12.5px] text-muted">Project links open read-only while you view as the customer; otherwise they open your own view of the project page.</p>
      </SectionCard>
    </div>
  );
}

function ViewAsPanel({ customerId, name, demo }: { customerId: string; name: string; demo?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      await call(`/api/admin/customers/${customerId}/view`, { method: "POST" });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
      setBusy(false);
    }
  }
  return (
    <SectionCard title="Support" description="See the app exactly as this customer sees it, without being able to change anything.">
      {error && <p role="alert" className="rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>}
      {!confirming ? (
        <Button type="button" variant="primary" onClick={() => setConfirming(true)} disabled={demo}>
          <Eye className="size-4" aria-hidden />
          View as customer
        </Button>
      ) : (
        <div className="fold-in rounded-panel border border-ink bg-surface p-4">
          <p className="text-[14.5px] leading-relaxed text-ink">You will be signed in as <strong>{name}</strong> and see exactly what they see. Spending their credits and making changes are blocked while you do. This is recorded in the audit log.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="accent" onClick={start} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              Start viewing
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}
      {demo && <p className="text-[12.5px] text-muted">Demo mode has no accounts to view.</p>}
    </SectionCard>
  );
}

function AdjustCredits({ customerId, balance: initial, demo }: { customerId: string; balance: number; demo?: boolean }) {
  const [balance, setBalance] = useState(initial);
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<{ token: string; n: number } | null>(null);
  const [allowNegative, setAllowNegative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const n = Math.round(Number(credits));
  const valid = Number.isFinite(n) && n !== 0 && reason.trim().length >= 3;
  function onReview(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setMsg(null);
    setAllowNegative(false);
    setReview({ token: crypto.randomUUID(), n });
  }
  async function confirm() {
    if (!review) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ balance: number }>(`/api/admin/customers/${customerId}/credits`, { method: "POST", body: JSON.stringify({ credits: review.n, reason: reason.trim(), allowNegative, token: review.token }) });
      setBalance(r.balance);
      setReview(null);
      setCredits("");
      setReason("");
      setMsg({ tone: "ok", text: `Booked. New balance: ${r.balance.toLocaleString("en-US")} credits.` });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "negative") {
        setAllowNegative(true);
        setMsg({ tone: "error", text: `${err.message} Click Confirm again to book it anyway.` });
      } else setMsg({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard title="Adjust credits" description="Add or remove credits by hand. A minus sign removes credits. The reason is stored with the entry and in the audit log.">
      {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger" : "rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink"}>{msg.text}</p>}
      <form onSubmit={onReview} className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-end">
        <Field id="adj-credits" label="Credits">
          <Input id="adj-credits" value={credits} onChange={(e) => { setCredits(e.target.value); setReview(null); }} inputMode="numeric" placeholder="50 or -50" disabled={demo || busy} />
        </Field>
        <Field id="adj-reason" label="Reason">
          <Input id="adj-reason" value={reason} onChange={(e) => { setReason(e.target.value); setReview(null); }} placeholder="Goodwill after a failed batch" maxLength={300} disabled={demo || busy} />
        </Field>
        <Button type="submit" variant="secondary" disabled={demo || busy || !valid}>Review</Button>
      </form>
      {review && (
        <div className="fold-in rounded-panel border border-ink bg-surface p-4">
          <p className="text-[14.5px] text-ink">
            Balance <span className="font-mono tabular-nums">{balance.toLocaleString("en-US")}</span> → <span className={cn("font-mono font-semibold tabular-nums", balance + review.n < 0 && "text-danger")}>{(balance + review.n).toLocaleString("en-US")}</span> credits ({review.n > 0 ? "+" : ""}{review.n.toLocaleString("en-US")}). Reason: “{reason.trim()}”.
          </p>
          {balance + review.n < 0 && <p className="mt-1 text-[13px] text-danger">The balance goes below zero.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant={allowNegative ? "danger" : "primary"} onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {allowNegative ? "Confirm negative balance" : "Confirm"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReview(null)} disabled={busy}>Back</Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function LimitsPanel({ customerId, limits: initial, caps, demo }: { customerId: string; limits: CustomerLimits; caps: LimitCaps; demo?: boolean }) {
  const [limits, setLimits] = useState<CustomerLimits>(initial);
  const [form, setForm] = useState({ dailyUsd: String(initial.dailyUsd ?? 0), monthlyUsd: String(initial.monthlyUsd ?? 0), concurrentProjects: String(initial.concurrentProjects ?? 0), reason: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ limits: CustomerLimits }>(`/api/admin/customers/${customerId}/limits`, { method: "PUT", body: JSON.stringify({ dailyUsd: Number(form.dailyUsd) || 0, monthlyUsd: Number(form.monthlyUsd) || 0, concurrentProjects: Number(form.concurrentProjects) || 0, reason: form.reason.trim() || undefined }) });
      setLimits(r.limits);
      setForm((f) => ({ ...f, dailyUsd: String(r.limits.dailyUsd ?? 0), monthlyUsd: String(r.limits.monthlyUsd ?? 0), concurrentProjects: String(r.limits.concurrentProjects ?? 0), reason: "" }));
      setMsg({ tone: "ok", text: "Limits saved." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }
  const field = (key: "dailyUsd" | "monthlyUsd" | "concurrentProjects", label: string, cap: number, unit: string) => (
    <Field id={`lim-${key}`} label={label} hint={`0 = the plan's default · at most ${cap.toLocaleString("en-US")} ${unit}`}>
      <Input id={`lim-${key}`} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} inputMode="numeric" disabled={demo || busy} />
    </Field>
  );
  return (
    <SectionCard title="Limits" description="Raise this customer's spend per day and per month, or cap how many videos run at once. The plan's own limits apply when a field is 0; nothing goes above the hard caps.">
      {msg && <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger" : "rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink"}>{msg.text}</p>}
      <p className="text-[13px] text-muted">Now: {limits.dailyUsd ? `$${limits.dailyUsd} per day` : "plan default per day"} · {limits.monthlyUsd ? `$${limits.monthlyUsd} per month` : "plan default per month"} · {limits.concurrentProjects ? `${limits.concurrentProjects} at once` : "no limit at once"}.</p>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        {field("dailyUsd", "Spend per day (USD)", caps.dailyUsd, "USD")}
        {field("monthlyUsd", "Spend per month (USD)", caps.monthlyUsd, "USD")}
        {field("concurrentProjects", "Videos at once", caps.concurrentProjects, "videos")}
        <div className="sm:col-span-2">
          <Field id="lim-reason" label="Reason" optional>
            <Input id="lim-reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} maxLength={300} disabled={demo || busy} />
          </Field>
        </div>
        <div className="self-end">
          <Button type="submit" variant="primary" disabled={demo || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save limits
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

const KIND_LABEL: Record<string, string> = { reserve: "project_reserve", settle: "project_generation", refund: "refund", grant_free: "free_credits", grant_trial: "trial", grant_subscription: "subscription", grant_topup: "topup", grant_manual: "admin_adjustment", expire: "expired" };

function CreditHistory({ customerId, first, demo }: { customerId: string; first: LedgerPage; demo?: boolean }) {
  const [rows, setRows] = useState(first.rows);
  const [busy, setBusy] = useState(false);
  async function more() {
    setBusy(true);
    try {
      const page = await call<LedgerPage>(`/api/admin/customers/${customerId}/ledger?offset=${rows.length}`);
      setRows((r) => [...r, ...page.rows]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard title="Credit history" description="Every change to the balance, newest first.">
      {rows.length === 0 ? (
        <p className="text-[14px] text-muted">Nothing yet.</p>
      ) : (
        <AdminTable minWidth={640} className="p-0 shadow-none sm:p-0">
          <thead><tr><Th>Date</Th><Th right>Change</Th><Th>Reason</Th><Th>Note</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}><Td muted className="whitespace-nowrap">{when(r.createdAt)}</Td><Td right className={cn("font-mono", r.credits < 0 ? "text-danger" : "text-ink")}>{r.credits > 0 ? "+" : ""}{r.credits.toLocaleString("en-US")}</Td><Td className="font-mono text-[12.5px]">{KIND_LABEL[r.kind] ?? r.kind}</Td><Td muted>{r.note ?? "—"}</Td></Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>showing {rows.length} of {first.total}</span>
        {rows.length < first.total && <Button type="button" variant="secondary" size="sm" onClick={more} disabled={busy || demo}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}Load more</Button>}
      </div>
    </SectionCard>
  );
}
