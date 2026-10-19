"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Download, ExternalLink, Loader2, Upload } from "lucide-react";
import { config } from "@/lib/config";
import type { LanguageCode, Segment, Translation, TranslationQuality } from "@/lib/types";
import { LANGUAGES, languageOf } from "@/lib/languages";
import { estimatePerLanguageUsd, formatUsd, HEYGEN_PROOFREAD_USD_PER_SECOND, HEYGEN_TRANSLATE_USD_PER_SECOND } from "@/lib/translatePricing";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, controlClass, controlStateClass } from "@/components/ui/Field";
import { VideoDropzone, formatDuration, type UploadedVideo } from "@/components/ui/VideoDropzone";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SpendMeter } from "@/components/dev/SpendMeter";
import { ReviewPanel } from "@/components/translate/ReviewPanel";

/* ---------- types mirrored from the routes ---------- */

type Balance = { amount: number; unit: "usd" | "credits" } | null;
type Cue = { index: number; start: number; end: number; text: string };
type Session = { code: LanguageCode; heygen: string; role: "target" | "transcript"; proofreadId: string };
type SessionState = { status: "processing" | "completed" | "failed"; cues?: Cue[]; failureMessage?: string | null; inputLanguage?: string | null };
type Generated = { translationId: string; status: string; videoUrl?: string | null; srtUrl?: string | null; failureMessage?: string | null; balanceBefore: Balance; balanceAfter?: Balance; entryId: string; startedAt: string };
type Render = { renderId: string; status: string; url?: string | null; error?: string | null };

type Props = { keys: { heygen: boolean; anthropic: boolean; shotstack: boolean }; shotstackEnv: "stage" | "v1" };

const usd3 = (n: number) => `$${n.toFixed(3)}`;
function fmtBalance(b: Balance | undefined) {
  if (!b) return "n/a";
  return b.unit === "usd" ? `$${b.amount.toFixed(2)}` : `${b.amount.toFixed(2)} credits`;
}
function costBetween(before: Balance, after: Balance | undefined) {
  if (!before || !after || before.unit !== after.unit) return null;
  return { amount: Math.round((before.amount - after.amount) * 1000) / 1000, unit: before.unit };
}
async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error ?? `HTTP ${res.status}`) as Error & { code?: string; status?: number };
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  return body as T;
}
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Step({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-sm font-semibold text-surface">{n}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        {aside}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

export function TranslateTestPanel({ keys, shotstackEnv }: Props) {
  const [meterKey, setMeterKey] = useState(0);
  const bump = useCallback(() => setMeterKey((k) => k + 1), []);

  /* 1. upload */
  const [rights, setRights] = useState(false);
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [asset, setAsset] = useState<{ assetId: string; url: string; sizeBytes: number } | null>(null);
  const seconds = Math.max(1, Math.round(video?.seconds ?? 0));

  /* 2. languages */
  const [languages, setLanguages] = useState<{ total: number; matched: Record<LanguageCode, string | null>; account: { billingType: string | null; balance: Balance } } | null>(null);
  const [languagesError, setLanguagesError] = useState<string | null>(null);
  const [source, setSource] = useState<LanguageCode | "auto">("en");
  const [targets, setTargets] = useState<LanguageCode[]>(["de"]);
  const [mode, setMode] = useState<TranslationQuality>("speed");

  /* 3. proofread */
  const [confirmProofread, setConfirmProofread] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionState, setSessionState] = useState<Record<string, SessionState>>({});
  const [proofreadMeta, setProofreadMeta] = useState<{ balanceBefore: Balance; entryId: string; estimateUsd: number } | null>(null);
  const [proofreadError, setProofreadError] = useState<string | null>(null);

  /* 4. review */
  /** The user's edits per language; the review data itself is derived from the sessions below. */
  const [edits, setEdits] = useState<Partial<Record<LanguageCode, Segment[]>>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [planRefused, setPlanRefused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState(false);

  /* 5. generate */
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [generated, setGenerated] = useState<Partial<Record<LanguageCode, Generated>>>({});
  const [generateError, setGenerateError] = useState<string | null>(null);

  /* 6. captions */
  const [fit, setFit] = useState<"crop" | "contain">("crop");
  const [renders, setRenders] = useState<Partial<Record<LanguageCode, Render>>>({});
  const [captionError, setCaptionError] = useState<string | null>(null);

  const transcript = sessions.find((s) => s.role === "transcript");
  const targetSessions = sessions.filter((s) => s.role === "target");
  const allSessionsDone = sessions.length > 0 && sessions.every((s) => sessionState[s.proofreadId]?.status === "completed");

  /* ---- free: languages + balance ---- */
  useEffect(() => {
    if (!keys.heygen) return;
    call<NonNullable<typeof languages>>("/api/dev/translate/languages")
      .then(setLanguages)
      .catch((e: Error) => setLanguagesError(e.message));
  }, [keys.heygen]);

  /* ---- poll proofread sessions (free) ---- */
  useEffect(() => {
    const open = sessions.filter((s) => sessionState[s.proofreadId]?.status !== "completed" && sessionState[s.proofreadId]?.status !== "failed");
    if (open.length === 0) return;
    let stopped = false;
    const tick = async () => {
      for (const s of open) {
        try {
          const r = await call<{ status: SessionState["status"]; cues: Cue[] | null; failureMessage: string | null; inputLanguage: string | null; balance?: Balance }>(
            `/api/dev/translate/proofreads/${encodeURIComponent(s.proofreadId)}`,
          );
          if (stopped) return;
          setSessionState((prev) => ({ ...prev, [s.proofreadId]: { status: r.status, cues: r.cues ?? undefined, failureMessage: r.failureMessage, inputLanguage: r.inputLanguage } }));
          if (r.status !== "processing" && r.balance !== undefined && proofreadMeta) {
            const actual = costBetween(proofreadMeta.balanceBefore, r.balance);
            void fetch("/api/dev/cost/settle", json({ entryId: proofreadMeta.entryId, status: r.status === "failed" ? "failed" : "completed", actualUsd: actual?.unit === "usd" ? actual.amount : null })).finally(bump);
          }
        } catch (e) {
          if (!stopped) setProofreadError((e as Error).message);
        }
      }
    };
    void tick();
    const id = window.setInterval(tick, 6000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [sessions, sessionState, proofreadMeta, bump]);

  /* ---- review data: derived from the completed sessions, with the user's edits on top ---- */
  const translations = useMemo<Translation[]>(() => {
    if (!allSessionsDone) return [];
    const transcriptCues = transcript ? (sessionState[transcript.proofreadId]?.cues ?? []) : [];
    return targetSessions.map((s) => {
      const cues = sessionState[s.proofreadId]?.cues ?? [];
      const segments: Segment[] = cues.map((c) => {
        const parts = transcriptCues.filter((t) => Math.min(t.end, c.end) - Math.max(t.start, c.start) > 0.15);
        const original = parts.length ? parts.map((p) => p.text).join(" ") : (transcriptCues[c.index - 1]?.text ?? "");
        return { index: c.index, start: c.start, end: c.end, original, translated: c.text, text: c.text };
      });
      return { language: s.code, status: "waiting", segments: edits[s.code] ?? segments };
    });
  }, [allSessionsDone, transcript, targetSessions, sessionState, edits]);

  /* ---- poll translation renders (free) ---- */
  useEffect(() => {
    const open = Object.entries(generated).filter(([, g]) => g && g.status !== "completed" && g.status !== "failed") as [LanguageCode, Generated][];
    if (open.length === 0) return;
    let stopped = false;
    const tick = async () => {
      for (const [code, g] of open) {
        try {
          const r = await call<{ status: string; videoUrl: string | null; srtUrl: string | null; failureMessage: string | null; balance?: Balance }>(
            `/api/dev/translate/translations/${encodeURIComponent(g.translationId)}`,
          );
          if (stopped) return;
          setGenerated((prev) => ({ ...prev, [code]: { ...g, status: r.status, videoUrl: r.videoUrl, srtUrl: r.srtUrl, failureMessage: r.failureMessage, balanceAfter: r.balance } }));
          if (r.status === "completed" || r.status === "failed") {
            const actual = costBetween(g.balanceBefore, r.balance);
            void fetch("/api/dev/cost/settle", json({ entryId: g.entryId, status: r.status === "failed" ? "failed" : "completed", actualUsd: r.status === "failed" ? 0 : actual?.unit === "usd" ? actual.amount : null })).finally(bump);
          }
        } catch (e) {
          if (!stopped) setGenerateError((e as Error).message);
        }
      }
    };
    void tick();
    const id = window.setInterval(tick, 10000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [generated, bump]);

  /* ---- poll Shotstack renders (free) ---- */
  useEffect(() => {
    const open = Object.entries(renders).filter(([, r]) => r && r.status !== "done" && r.status !== "failed") as [LanguageCode, Render][];
    if (open.length === 0) return;
    let stopped = false;
    const tick = async () => {
      for (const [code, r] of open) {
        try {
          const s = await call<{ status: string; url: string | null; error: string | null }>(`/api/dev/translate/captions/${encodeURIComponent(r.renderId)}`);
          if (stopped) return;
          setRenders((prev) => ({ ...prev, [code]: { ...r, status: s.status, url: s.url, error: s.error } }));
        } catch (e) {
          if (!stopped) setCaptionError((e as Error).message);
        }
      }
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [renders]);

  /* ---- actions ---- */

  async function upload() {
    if (!video || !rights) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", video.file);
      form.append("rightsConfirmed", "true");
      setAsset(await call("/api/dev/translate/upload", { method: "POST", body: form }));
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const outputCount = targets.filter((t) => t !== source).length + (source !== "auto" ? 1 : 0);
  const proofreadEstimate = Math.round(seconds * HEYGEN_PROOFREAD_USD_PER_SECOND * outputCount * 100) / 100;
  const generateEstimatePerLanguage = Math.round(seconds * HEYGEN_TRANSLATE_USD_PER_SECOND[mode] * 100) / 100;

  async function startProofread() {
    if (!asset) return;
    setStarting(true);
    setProofreadError(null);
    try {
      const r = await call<{ sessions: Session[]; balanceBefore: Balance; entryId: string; estimateUsd: number }>(
        "/api/dev/translate/proofreads",
        json({ assetId: asset.assetId, seconds, sourceLanguage: source, targetLanguages: targets, mode, confirmed: true, rightsConfirmed: true }),
      );
      setSessions(r.sessions);
      setSessionState(Object.fromEntries(r.sessions.map((s) => [s.proofreadId, { status: "processing" as const }])));
      setProofreadMeta({ balanceBefore: r.balanceBefore, entryId: r.entryId, estimateUsd: r.estimateUsd });
      setConfirmProofread(false);
      bump();
    } catch (e) {
      setProofreadError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function rewriteEstimate(language: LanguageCode, segments: Segment[]) {
    const r = await call<{ estimateUsd: number }>("/api/dev/translate/rewrite", json({ language, segments, estimateOnly: true }));
    return r.estimateUsd;
  }

  async function rewrite(language: LanguageCode, segments: Segment[]) {
    const r = await call<{ segments: Segment[]; violations: { index: number }[]; costUsd: number }>("/api/dev/translate/rewrite", json({ language, segments, confirmed: true }));
    bump();
    if (r.violations.length) setReviewError(`Claude left ${r.violations.length} fragment(s) over the limit; shorten them by hand (marked in red).`);
    return r.segments.map((s, i) => ({ ...segments[i], text: s.text }));
  }

  /** "Create videos" on the test page: save every SRT at HeyGen (free), then ask to confirm the paid render. */
  async function approve() {
    setSaving(true);
    setReviewError(null);
    setPlanRefused(null);
    try {
      for (const t of translations) {
        const session = targetSessions.find((s) => s.code === t.language);
        if (!session) continue;
        await call(`/api/dev/translate/proofreads/${encodeURIComponent(session.proofreadId)}/srt`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rightsConfirmed: true, cues: t.segments.map((s) => ({ index: s.index, start: s.start, end: s.end, text: s.text })) }),
        });
      }
      setApproved(true);
      setConfirmGenerate(true);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "plan_required") setPlanRefused(err.message);
      else setReviewError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateAll() {
    setGenerateError(null);
    setConfirmGenerate(false);
    for (const session of targetSessions) {
      try {
        const r = await call<{ translationId: string; status: string; balanceBefore: Balance; entryId: string; startedAt: string }>(
          `/api/dev/translate/proofreads/${encodeURIComponent(session.proofreadId)}/generate`,
          json({ seconds, mode, confirmed: true, rightsConfirmed: true }),
        );
        setGenerated((prev) => ({ ...prev, [session.code]: { ...r } }));
        bump();
      } catch (e) {
        setGenerateError(`${languageOf(session.code).label}: ${(e as Error).message}`);
      }
    }
  }

  async function addCaptions(code: LanguageCode) {
    const g = generated[code];
    if (!g?.videoUrl) return;
    setCaptionError(null);
    try {
      const r = await call<{ renderId: string }>("/api/dev/translate/captions", json({ videoUrl: g.videoUrl, seconds, srtUrl: g.srtUrl ?? undefined, fit, confirmed: true, rightsConfirmed: true }));
      setRenders((prev) => ({ ...prev, [code]: { renderId: r.renderId, status: "queued" } }));
      bump();
    } catch (e) {
      setCaptionError((e as Error).message);
    }
  }

  /* ---------- render ---------- */

  const missing = (["heygen", "anthropic", "shotstack"] as const).filter((k) => !keys[k]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-3">
        <SpendMeter refreshKey={meterKey} className="xl:col-span-2" />
        <Card>
          <CardContent className="space-y-2 pt-5 text-sm sm:pt-7">
            <p className="label-mono text-muted">Keys</p>
            {(["heygen", "anthropic", "shotstack"] as const).map((k) => (
              <p key={k} className="flex items-center justify-between">
                <span className="capitalize text-ink">{k}</span>
                <Badge tone={keys[k] ? "success" : "danger"}>{keys[k] ? "filled" : "empty"}</Badge>
              </p>
            ))}
            <p className="flex items-center justify-between">
              <span className="text-ink">Shotstack env</span>
              <Badge tone={shotstackEnv === "stage" ? "warning" : "danger"}>{shotstackEnv === "stage" ? "sandbox · free" : "production"}</Badge>
            </p>
            {languages && (
              <p className="flex items-center justify-between border-t border-divider pt-2">
                <span className="text-ink">HeyGen balance</span>
                <span className="label-mono">{fmtBalance(languages.account.balance)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {missing.length > 0 && (
        <p role="alert" className="rounded-[14px] bg-danger/10 p-4 text-sm text-ink">
          Missing keys: {missing.join(", ")}. Add them to .env.local and restart the dev server.
        </p>
      )}

      {/* 1 */}
      <Step n={1} title="Upload the source video to HeyGen" aside={asset ? <Badge tone="success">uploaded</Badge> : <Badge>free</Badge>}>
        <VideoDropzone video={video} onChange={(v) => { setVideo(v); setAsset(null); setUploadError(null); }} maxSizeMb={config.limits.translateVideoMaxMb} maxSeconds={config.limits.translateVideoMaxSeconds} onReject={setUploadError} disabled={uploading || sessions.length > 0} />
        <label htmlFor="dev-rights" className={cn("flex cursor-pointer items-start gap-3 rounded-[14px] border p-4", rights ? "border-success/40 bg-success/5" : "border-border bg-surface-muted")}>
          <input id="dev-rights" type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} disabled={sessions.length > 0} className="mt-0.5 size-4 accent-ink" />
          <span className="text-sm leading-relaxed text-ink">{config.rightsConfirmationText}</span>
        </label>
        {uploadError && <p role="alert" className="text-sm text-danger">{uploadError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={upload} disabled={!video || !rights || uploading || !!asset || !keys.heygen}>
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {asset ? "Uploaded" : "Upload to HeyGen (free)"}
          </Button>
          {video?.seconds !== undefined && <span className="label-mono text-muted">{formatDuration(video.seconds)} · {seconds} s billed</span>}
          {asset && <span className="label-mono text-muted">asset {asset.assetId.slice(0, 10)}…</span>}
        </div>
      </Step>

      {/* 2 */}
      <Step n={2} title="Languages and mode" aside={<Badge>free</Badge>}>
        {languagesError && <p role="alert" className="text-sm text-danger">{languagesError}</p>}
        {languages && (
          <p className="text-[13px] text-muted">
            HeyGen lists {languages.total} target languages. Ours:{" "}
            {LANGUAGES.map((l) => `${l.label} ${languages.matched[l.code] ? "✓" : "✗"}`).join(" · ")}
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="dev-source" label="Spoken language" hint="Pick it when you know it: that also gives the original text next to each fragment (one extra proofread fee). Auto: no original column on this page.">
            <select id="dev-source" value={source} onChange={(e) => setSource(e.target.value as LanguageCode | "auto")} disabled={sessions.length > 0} className={cn(controlClass, controlStateClass(false), "h-11")}>
              <option value="auto">Detect automatically</option>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field id="dev-mode" label="Mode">
            <select id="dev-mode" value={mode} onChange={(e) => setMode(e.target.value as TranslationQuality)} disabled={sessions.length > 0} className={cn(controlClass, controlStateClass(false), "h-11")}>
              <option value="speed">Speed · ≈ {formatUsd(estimatePerLanguageUsd(seconds, "speed").translation)} per language</option>
              <option value="precision">Precision · ≈ {formatUsd(estimatePerLanguageUsd(seconds, "precision").translation)} per language</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const selected = targets.includes(l.code);
            const disabled = sessions.length > 0 || source === l.code || (languages ? !languages.matched[l.code] : false);
            return (
              <button key={l.code} type="button" aria-pressed={selected} disabled={disabled} onClick={() => setTargets((t) => (t.includes(l.code) ? t.filter((c) => c !== l.code) : [...t, l.code]))} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all disabled:opacity-40", selected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink hover:bg-surface-muted")}>
                {selected && <Check className="size-4" aria-hidden />}
                {l.label}
              </button>
            );
          })}
        </div>
      </Step>

      {/* 3 */}
      <Step n={3} title="Proofread session (translate, keep subtitles editable)" aside={<Badge tone="danger">paid · ≈ {formatUsd(proofreadEstimate)}</Badge>}>
        <p className="text-sm text-muted">
          One session for {outputCount} output language{outputCount === 1 ? "" : "s"} ({targets.filter((t) => t !== source).map((t) => languageOf(t).tag).join(", ")}
          {source !== "auto" ? ` + ${languageOf(source).tag} transcript` : ""}) on {seconds} s of video. Proofread rate ≈ $0.004 per second per language. The paid render comes later, after your approval.
        </p>
        {proofreadError && <p role="alert" className="text-sm text-danger">{proofreadError}</p>}
        {sessions.length === 0 ? (
          confirmProofread ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-danger/5 p-4">
              <span className="text-sm text-ink">This charges about {formatUsd(proofreadEstimate)} at HeyGen. Continue?</span>
              <Button onClick={startProofread} disabled={starting}>{starting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}Start session</Button>
              <Button variant="ghost" onClick={() => setConfirmProofread(false)} disabled={starting}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmProofread(true)} disabled={!asset || !rights || targets.filter((t) => t !== source).length === 0}>Start proofread session…</Button>
          )
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const st = sessionState[s.proofreadId];
              return (
                <li key={s.proofreadId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">{languageOf(s.code).label}{s.role === "transcript" ? " (transcript)" : ""} <span className="label-mono text-muted">{s.proofreadId.slice(0, 10)}…</span></span>
                  <span className="flex items-center gap-2">
                    {st?.inputLanguage && <span className="label-mono text-muted">source: {st.inputLanguage}</span>}
                    {st?.cues && <span className="label-mono text-muted">{st.cues.length} cues</span>}
                    <StatusBadge status={st?.status === "completed" ? "completed" : st?.status === "failed" ? "failed" : "processing"} />
                  </span>
                </li>
              );
            })}
            {sessions.some((s) => sessionState[s.proofreadId]?.failureMessage) && (
              <li className="text-sm text-danger">{sessions.map((s) => sessionState[s.proofreadId]?.failureMessage).filter(Boolean).join(" · ")}</li>
            )}
            {proofreadMeta && <li className="label-mono text-muted">balance before: {fmtBalance(proofreadMeta.balanceBefore)} · estimate {formatUsd(proofreadMeta.estimateUsd)}</li>}
          </ul>
        )}
      </Step>

      {/* 4 */}
      {translations.length > 0 && !approved && (
        <div className="space-y-4">
          {reviewError && <p role="alert" className="text-sm text-danger">{reviewError}</p>}
          {planRefused && (
            <div role="alert" className="flex items-start gap-3 rounded-[14px] bg-danger/10 p-4 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <span>{planRefused}</span>
            </div>
          )}
          <ReviewPanel
            translations={translations}
            sourceLanguage={source === "auto" ? ((sessionState[targetSessions[0]?.proofreadId]?.inputLanguage?.slice(0, 2) as LanguageCode) ?? "en") : source}
            onChange={(language, segments) => setEdits((prev) => ({ ...prev, [language]: segments }))}
            onRewrite={rewrite}
            rewriteEstimate={rewriteEstimate}
            onApprove={approve}
            approving={saving}
            approveLabel="Save subtitles at HeyGen"
            approveNote="Free: puts your edited SRT on each session. The paid render is confirmed in the next step."
          />
        </div>
      )}

      {/* 5 */}
      {approved && (
        <Step n={5} title="Render the translated video" aside={<Badge tone="danger">paid · ≈ {formatUsd(generateEstimatePerLanguage)} per language</Badge>}>
          {generateError && <p role="alert" className="text-sm text-danger">{generateError}</p>}
          {Object.keys(generated).length === 0 ? (
            confirmGenerate ? (
              <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-danger/5 p-4">
                <span className="text-sm text-ink">This charges about {formatUsd(generateEstimatePerLanguage * targetSessions.length)} at HeyGen ({mode}, {targetSessions.length} language{targetSessions.length === 1 ? "" : "s"}). Continue?</span>
                <Button onClick={generateAll}><Check className="size-4" aria-hidden />Render</Button>
                <Button variant="ghost" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={() => setConfirmGenerate(true)}>Render translated video…</Button>
            )
          ) : (
            <ul className="space-y-3">
              {targetSessions.map((s) => {
                const g = generated[s.code];
                if (!g) return null;
                const actual = costBetween(g.balanceBefore, g.balanceAfter);
                return (
                  <li key={s.code} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-surface-muted p-4 text-sm">
                    <span className="text-ink">{languageOf(s.code).label} <span className="label-mono text-muted">{g.translationId.slice(0, 10)}…</span></span>
                    <span className="flex flex-wrap items-center gap-3">
                      {actual && <span className="label-mono text-muted">cost {actual.unit === "usd" ? `$${actual.amount.toFixed(3)}` : `${actual.amount} credits`}</span>}
                      {g.videoUrl && <a href={g.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-4"><ExternalLink className="size-3.5" aria-hidden />video</a>}
                      {g.srtUrl && <a href={g.srtUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-4"><Download className="size-3.5" aria-hidden />srt</a>}
                      {g.failureMessage && <span className="text-danger">{g.failureMessage}</span>}
                      <StatusBadge status={g.status === "completed" ? "completed" : g.status === "failed" ? "failed" : "processing"} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>
      )}

      {/* 6 */}
      {Object.values(generated).some((g) => g?.status === "completed") && (
        <Step n={6} title="Captions and 9:16 via Shotstack" aside={<Badge tone={shotstackEnv === "stage" ? "warning" : "danger"}>{shotstackEnv === "stage" ? "sandbox · free · watermark" : `production · ≈ ${usd3(seconds * (10 / 3000))}`}</Badge>}>
          <Field id="dev-fit" label="Framing" hint="Crop fills 9:16 and centres the speaker; contain keeps the whole picture with bars.">
            <select id="dev-fit" value={fit} onChange={(e) => setFit(e.target.value as "crop" | "contain")} className={cn(controlClass, controlStateClass(false), "h-11 max-w-xs")}>
              <option value="crop">Crop to 9:16</option>
              <option value="contain">Contain (letterbox)</option>
            </select>
          </Field>
          {captionError && <p role="alert" className="text-sm text-danger">{captionError}</p>}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {targetSessions.map((s) => {
              const g = generated[s.code];
              const r = renders[s.code];
              if (g?.status !== "completed") return null;
              return (
                <Card key={s.code}>
                  <CardHeader className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{languageOf(s.code).label}</CardTitle>
                    {r && <StatusBadge status={r.status === "done" ? "completed" : r.status === "failed" ? "failed" : "processing"} />}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r?.url ? <VideoPlayer src={r.url} /> : <p className="text-[13px] text-muted">{r ? `Shotstack: ${r.status}${r.error ? ` · ${r.error}` : ""}` : "Not rendered yet."}</p>}
                    {r?.url ? (
                      <Button href={r.url} variant="primary" className="w-full" target="_blank" rel="noreferrer"><Download className="size-4" aria-hidden />Open MP4</Button>
                    ) : (
                      <Button onClick={() => addCaptions(s.code)} disabled={!!r && r.status !== "failed"} className="w-full">{r && r.status !== "failed" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}Add captions + 9:16</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-[13px] text-muted">URLs from HeyGen and Shotstack expire; Stage 8 copies every result to our own storage.</p>
        </Step>
      )}
    </div>
  );
}
