"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Download, ExternalLink, Loader2 } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SpendMeter } from "@/components/dev/SpendMeter";

type Phase = "idle" | "confirm" | "uploading" | "polling" | "done" | "failed";
type Run = {
  renderId: string;
  env: string;
  startedAt: string;
  finishedAt?: string;
  url?: string;
  duration?: number;
  renderTime?: number;
  error?: string;
  status?: string;
  edit?: unknown;
  assets?: { presenter: string; product: string; music: string; presenterSeconds: number };
  meta?: { totalSeconds: number };
  entryId?: string;
};

const STORAGE_KEY = "reelay.dev.final-edit.runs";

export function FinalEditTestPanel({ keyPresent, env }: { keyPresent: boolean; env: "stage" | "v1" }) {
  const [hook, setHook] = useState("Tired of dull skin?");
  const [benefits, setBenefits] = useState(["Brighter in 14 days", "Vegan & fragrance-free", "One drop a day"]);
  const [headline, setHeadline] = useState("Glow Vitamin C Serum");
  const [cta, setCta] = useState("Shop now");
  const [presenterUrl, setPresenterUrl] = useState("");
  const [productClipUrl, setProductClipUrl] = useState("");
  const [musicUrl, setMusicUrl] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [meterKey, setMeterKey] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setRuns(JSON.parse(stored) as Run[]);
      } catch { /* ignore */ }
    });
  }, []);

  useEffect(() => {
    if (!run || (phase !== "uploading" && phase !== "polling")) return;
    const started = Date.parse(run.startedAt);
    const id = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => window.clearInterval(id);
  }, [run, phase]);

  useEffect(() => {
    if (phase !== "polling" || !run) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/dev/final-edit/render/${encodeURIComponent(run.renderId)}?entry=${encodeURIComponent(run.entryId ?? "")}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (stopped) return;
        setRun((r) => (r ? { ...r, status: body.status } : r));
        if (body.status === "done" || body.status === "failed") {
          const finished: Run = { ...run, status: body.status, finishedAt: new Date().toISOString(), url: body.url, duration: body.duration, renderTime: body.renderTime, error: body.error };
          setRun(finished);
          setPhase(body.status === "done" ? "done" : "failed");
          setMeterKey((k) => k + 1);
          setRuns((prev) => {
            const next = [finished, ...prev.filter((x) => x.renderId !== finished.renderId)].slice(0, 20);
            try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
        }
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => { stopped = true; window.clearInterval(id); };
  }, [phase, run?.renderId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function render() {
    setError(null);
    const startedAt = new Date().toISOString();
    setRun({ renderId: "", env, startedAt });
    setElapsed(0);
    setPhase("uploading");
    try {
      const res = await fetch("/api/dev/final-edit/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook, benefits, headline, cta, presenterUrl, productClipUrl, musicUrl, confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRun({ renderId: body.renderId, env: body.env, startedAt: body.startedAt ?? startedAt, edit: body.edit, assets: body.assets, meta: body.meta, status: "queued", entryId: body.entryId });
      setPhase("polling");
      setMeterKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
      setRun(null);
      setMeterKey((k) => k + 1);
    }
  }

  const busy = phase === "uploading" || phase === "polling";
  const valid = hook.trim() && benefits.every((b) => b.trim()) && headline.trim() && cta.trim();

  return (
    <div className="grid gap-8 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <SpendMeter refreshKey={meterKey} />
        {!keyPresent && (
          <Card><CardContent className="pt-5 sm:pt-7"><p className="text-sm font-semibold text-danger">SHOTSTACK_API_KEY is not set</p><p className="mt-1 text-sm text-muted">Add the sandbox key to <code>.env.local</code> (SHOTSTACK_ENV=stage) and restart the dev server.</p></CardContent></Card>
        )}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Copy</p>
            <CardTitle className="mt-2">Texts</CardTitle>
            <p className="mt-1 text-[15px] text-muted">Paste the JSON fields from the script test, or keep the defaults.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field id="hook" label="Hook (first 2 seconds)" hint="Short and loud; shown as a sticker over the product clip.">
              <Input id="hook" value={hook} onChange={(e) => setHook(e.target.value)} disabled={busy} />
            </Field>
            <div className="grid gap-3 md:grid-cols-3">
              {benefits.map((b, i) => (
                <Field key={i} id={`benefit-${i}`} label={`Benefit ${i + 1}`}>
                  <Input id={`benefit-${i}`} value={b} disabled={busy} onChange={(e) => setBenefits((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
                </Field>
              ))}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="headline" label="End card headline"><Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={busy} /></Field>
              <Field id="cta" label="Call to action"><Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} disabled={busy} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Sources</p>
            <CardTitle className="mt-2">Clips and music</CardTitle>
            <p className="mt-1 text-[15px] text-muted">Leave empty to use the demo files: a presenter clip with real speech (for the captions), the gradient product clip and a synthetic music track. Public URLs only; Shotstack fetches them itself.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field id="presenterUrl" label="Presenter clip URL" optional hint="e.g. the video_url from the HeyGen test (temporary link)."><Input id="presenterUrl" value={presenterUrl} onChange={(e) => setPresenterUrl(e.target.value)} disabled={busy} placeholder="demo: sample-presenter.mp4" /></Field>
            <Field id="productClipUrl" label="Product clip URL" optional hint="e.g. the clip from the product clip test."><Input id="productClipUrl" value={productClipUrl} onChange={(e) => setProductClipUrl(e.target.value)} disabled={busy} placeholder="demo: sample-video.mp4" /></Field>
            <Field id="musicUrl" label="Music URL" optional hint="MP3 or WAV. Later: a track from the HeyGen music catalogue."><Input id="musicUrl" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} disabled={busy} placeholder="demo: sample-music.mp3" /></Field>

            <div className="rounded-[14px] bg-surface-muted p-4 text-sm">
              <p className="font-semibold text-ink">{env === "stage" ? "Sandbox render: free, with a Shotstack watermark." : "Production render: about $0.10 per 30-second ad (pay-as-you-go)."}</p>
              <p className="mt-1 text-[13px] text-muted">Output 1080×1920, 25 fps. Structure: hook 2 s → presenter → product clip with benefits 4 s → end card 3 s. Captions are transcribed from the presenter audio.</p>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            {phase === "confirm" ? (
              <div className="flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">This renders in <strong>production</strong> and uses credits. Continue?</p>
                <div className="flex shrink-0 gap-2"><Button variant="ghost" onClick={() => setPhase("idle")}>Cancel</Button><Button variant="accent" onClick={render}>Render</Button></div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted">{env === "stage" ? "No confirmation needed in the sandbox." : "You confirm the cost before anything is rendered."}</p>
                <Button variant="accent" size="lg" disabled={!valid || busy || !keyPresent} onClick={() => (env === "stage" ? render() : setPhase("confirm"))}>
                  {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Clapperboard className="size-5" aria-hidden />}
                  {phase === "uploading" ? "Uploading…" : phase === "polling" ? "Rendering…" : env === "stage" ? "Render in sandbox" : "Test final edit"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6 xl:col-span-2 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <CardTitle>Result</CardTitle>
            {run && <StatusBadge status={phase === "done" ? "completed" : phase === "failed" ? "failed" : "processing"} />}
          </CardHeader>
          <CardContent className="space-y-4">
            {!run && <p className="text-sm text-muted">No render yet.</p>}
            {run && busy && (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-tile bg-surface-muted">
                  <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">{phase === "uploading" ? "Uploading demo files to Shotstack…" : `Shotstack: ${run.status ?? "queued"}`}</div>
                </div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted">Elapsed</span><span className="label-mono text-ink">{Math.floor(elapsed / 60000)}:{String(Math.floor((elapsed / 1000) % 60)).padStart(2, "0")}</span></div>
                <p className="text-[13px] text-muted">Polling every 5 s. A 20-second ad usually renders in one to two minutes.</p>
              </div>
            )}
            {run && phase === "failed" && (
              <div className="space-y-2"><p className="text-sm font-semibold text-danger">Shotstack could not render this edit</p><p className="text-sm text-ink/80">{run.error ?? "No reason given."}</p></div>
            )}
            {run && phase === "done" && run.url && (
              <div className="space-y-4">
                <VideoPlayer src={run.url} className="mx-auto w-full max-w-[240px]" />
                <div className="grid gap-2">
                  <Button href={run.url} variant="accent" download><Download className="size-4" aria-hidden />Download</Button>
                  <Button href={run.url} variant="secondary" target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden />Open in new tab</Button>
                </div>
                <dl className="divide-y divide-divider rounded-[14px] bg-surface-muted px-4 text-sm">
                  {([
                    ["Environment", run.env === "stage" ? "sandbox (watermark)" : "production"],
                    ["Video length", run.duration != null ? `${run.duration.toFixed(1)} s` : "—"],
                    ["Render time", run.renderTime != null ? `${Math.round(run.renderTime / 1000)} s` : "—"],
                    ["Total wait", run.finishedAt ? `${Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000)} s` : "—"],
                    ["Cost", run.env === "stage" ? "free" : "≈ $0.10 (list price)"],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>
                  ))}
                </dl>
                <p className="text-[13px] text-muted">The link expires after 24 hours; the file stays on Shotstack&apos;s CDN.</p>
              </div>
            )}
            {run?.edit !== undefined && (
              <div className="space-y-2">
                <Button variant="secondary" size="sm" onClick={() => setShowJson((v) => !v)}>{showJson ? "Hide edit JSON" : "Show edit JSON"}</Button>
                {showJson && <pre className="max-h-96 overflow-auto rounded-[14px] bg-ink p-4 text-[11px] leading-relaxed text-surface">{JSON.stringify(run.edit, null, 2)}</pre>}
              </div>
            )}
          </CardContent>
        </Card>
        {runs.length > 0 && (
          <Card>
            <CardHeader className="flex items-start justify-between gap-3"><CardTitle>Previous renders</CardTitle><Badge tone="neutral">{runs.length}</Badge></CardHeader>
            <CardContent>
              <ul className="divide-y divide-divider text-[13px]">
                {runs.map((r) => (
                  <li key={r.renderId} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-muted">{new Date(r.startedAt).toLocaleTimeString()} · {r.duration != null ? `${r.duration.toFixed(0)} s` : "—"}</span>
                    {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-ink underline decoration-border underline-offset-4">open</a> : <span className="text-danger">failed</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
