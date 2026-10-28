"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, RotateCw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { languageOf } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";
import { RATING_LABELS, type CheckStatus } from "@/lib/quality/report";
import type { QualityRow } from "@/lib/quality/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const STATUS: Record<CheckStatus, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  pass: { tone: "success", label: "OK" },
  warn: { tone: "warning", label: "Look" },
  fail: { tone: "danger", label: "Wrong" },
  skipped: { tone: "neutral", label: "Skipped" },
};

const label = (code: string) => {
  try {
    return languageOf(code as LanguageCode).label;
  } catch {
    return code;
  }
};

async function post(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!r.ok || !j.ok) throw new Error(j.error ?? "Something went wrong.");
}

/**
 * /admin/quality (28 Oct 2026): every finished language version gets an automatic report; Tijs adds
 * his own verdict (good/bad, what was wrong) so patterns over many tests become visible.
 */
export function QualityView({ reports, unchecked }: { reports: QualityRow[]; unchecked: { projectId: string; language: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (projectId: string, language: string) => {
    setBusy(`${projectId}:${language}`);
    setError(null);
    try {
      await post("/api/admin/quality/run", "POST", { projectId, language });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the check.");
    } finally {
      setBusy(null);
    }
  };
  const rated = reports.filter((r) => r.rating);
  const avg = reports.filter((r) => r.score !== null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quality"
        badge={<Badge tone="warning" className="translate-y-1">Administrators only</Badge>}
        description="Each finished translation is checked automatically: meaning, spoken words, old text, captions, the ending and the framing. Add your own verdict; the patterns tell what to improve next."
        actions={<Button href="/admin" variant="secondary" size="sm">Back to admin</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="space-y-1 pt-6"><p className="text-[13px] text-muted">Reports</p><p className="text-title">{reports.length}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-6"><p className="text-[13px] text-muted">Average score</p><p className="text-title">{avg.length ? Math.round(avg.reduce((n, r) => n + (r.score ?? 0), 0) / avg.length) : "–"}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-6"><p className="text-[13px] text-muted">Your verdicts</p><p className="text-title">{rated.filter((r) => r.rating === "good").length} good · {rated.filter((r) => r.rating === "bad").length} bad</p></CardContent></Card>
      </section>

      {error && <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {unchecked.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium text-ink">Your finished videos without a report</p>
            <ul className="divide-y divide-divider">
              {unchecked.map((u) => (
                <li key={`${u.projectId}:${u.language}`} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="min-w-0 truncate text-ink">{u.name} <span className="text-muted">· {label(u.language)}</span></span>
                  <Button size="sm" variant="secondary" onClick={() => run(u.projectId, u.language)} disabled={busy !== null}>
                    {busy === `${u.projectId}:${u.language}` ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    Check
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-muted">No reports yet. They appear here a few minutes after a translation is finished.</p>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => <ReportCard key={r.id} report={r} onRun={run} busy={busy} />)}
        </ul>
      )}
    </div>
  );
}

function ReportCard({ report: r, onRun, busy }: { report: QualityRow; onRun: (projectId: string, language: string) => void; busy: string | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(r.rating);
  const [labels, setLabels] = useState<string[]>(r.labels);
  const [note, setNote] = useState(r.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async (patch: { rating?: "good" | "bad" | null; labels?: string[]; note?: string | null }) => {
    setSaving(true);
    setSaved(false);
    try {
      await post(`/api/admin/quality/${r.id}`, "PATCH", patch);
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };
  const toggle = (l: string) => {
    const next = labels.includes(l) ? labels.filter((x) => x !== l) : [...labels, l];
    setLabels(next);
    void save({ labels: next });
  };
  const tone = r.score === null ? "neutral" : r.score >= 85 ? "success" : r.score >= 60 ? "warning" : "danger";

  return (
    <li>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold text-ink">
                {r.own ? <Link href={`/projects/${r.projectId}`} className="focus-ring rounded-control hover:underline">{r.projectName}</Link> : r.projectName}
              </p>
              <p className="text-[13px] text-muted">{label(r.language)} · {formatDate(r.createdAt)}{r.costUsd !== null ? ` · check cost $${r.costUsd.toFixed(3)}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "running" ? <Badge tone="neutral">Checking…</Badge> : <Badge tone={tone}>Score {r.score ?? "–"}</Badge>}
              <Button size="sm" variant="ghost" onClick={() => onRun(r.projectId, r.language)} disabled={busy !== null} aria-label="Check again">
                {busy === `${r.projectId}:${r.language}` ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCw className="size-4" aria-hidden />}
              </Button>
            </div>
          </div>

          {r.error && <p className="text-sm text-danger">{r.error}</p>}

          <ul className="grid gap-2 sm:grid-cols-2">
            {r.checks.map((c) => (
              <li key={c.key} className="rounded-[14px] bg-surface-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{c.label}</span>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                </div>
                {c.detail && <p className="mt-1 text-[13px] leading-relaxed text-muted">{c.detail}</p>}
                {c.items && c.items.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] text-ink">
                    {c.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {r.frames && (
            <div className="flex gap-2">
              {(["first", "middle", "last"] as const).map((k) => (
                // eslint-disable-next-line @next/next/no-img-element -- temporary frame links from the review, admin only
                <img key={k} src={r.frames![k]} alt={`${k} frame`} className="h-40 w-auto rounded-[10px] bg-surface-muted object-cover" />
              ))}
            </div>
          )}
          {r.heard && (
            <details className="text-[13px]">
              <summary className="cursor-pointer text-muted">What the transcription heard</summary>
              <p className="mt-1 leading-relaxed text-ink">{r.heard}</p>
            </details>
          )}

          {r.own && (
            <div className="space-y-3 border-t border-divider pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Your verdict</span>
                <button type="button" onClick={() => { const v = rating === "good" ? null : "good"; setRating(v); void save({ rating: v }); }} className={cn("focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", rating === "good" ? "border-success bg-success/10 text-success" : "border-border text-ink")} aria-pressed={rating === "good"}>
                  <ThumbsUp className="size-4" aria-hidden /> Good
                </button>
                <button type="button" onClick={() => { const v = rating === "bad" ? null : "bad"; setRating(v); void save({ rating: v }); }} className={cn("focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", rating === "bad" ? "border-danger bg-danger/10 text-danger" : "border-border text-ink")} aria-pressed={rating === "bad"}>
                  <ThumbsDown className="size-4" aria-hidden /> Not good
                </button>
                {saving ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : saved ? <Check className="size-4 text-success" aria-label="Saved" /> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {RATING_LABELS.map((l) => (
                  <button key={l} type="button" onClick={() => toggle(l)} aria-pressed={labels.includes(l)} className={cn("focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px]", labels.includes(l) ? "bg-ink text-surface" : "bg-surface-muted text-ink")}>
                    {labels.includes(l) && <X className="size-3" aria-hidden />}
                    {l}
                  </button>
                ))}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (r.note ?? "") && save({ note })} rows={2} placeholder="What did you notice? (saved when you click away)" className="focus-ring w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink" />
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
