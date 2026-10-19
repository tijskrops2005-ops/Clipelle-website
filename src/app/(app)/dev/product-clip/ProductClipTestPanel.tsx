"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, ImagePlus, Loader2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SpendMeter } from "@/components/dev/SpendMeter";

/* Mirrors constants in src/lib/services/productClip.ts (server-only). */
const EXPAND_USD = 0.04;
const CLIP_SECONDS = 5;
type ModelKey = "minimax" | "minimax_turbo" | "kling_standard" | "kling";
const PROMO = new Date() < new Date("2026-11-01");
/* Mirrors CLIP_MODELS in src/lib/services/productClip.ts (server-only). Prices: fal.ai, 2026-10-19. */
const MODELS: Record<ModelKey, { label: string; blurb: string; usdPerSecond: number }> = {
  minimax: { label: "MiniMax H3 Max (768p)", blurb: "Cheapest, fast, photo as first frame. Upscaled to 1080p in the edit.", usdPerSecond: PROMO ? 0.052 : 0.08 },
  minimax_turbo: { label: "MiniMax H3 Max Turbo (1080p)", blurb: "Tuned for prompt adherence and aesthetics, native 1080p. Default until 31 October.", usdPerSecond: PROMO ? 0.052 : 0.08 },
  kling_standard: { label: "Kling v3 Standard", blurb: "Strong product fidelity at 1080p, audio off. Default from 1 November.", usdPerSecond: 0.084 },
  kling: { label: "Kling v3 Pro", blurb: "Highest fidelity, audio off. Costs more without a visible gain for a still product.", usdPerSecond: 0.112 },
};

type Analysis = {
  width: number; height: number;
  bbox: { left: number; top: number; width: number; height: number };
  coverage: number; background: { r: number; g: number; b: number }; detected: boolean;
};
type Plan = { fits: boolean; recommended: "crop" | "expand"; crop: { left: number; top: number; width: number; height: number } };
type Prepared = { imageId: string; analysis: Analysis; plan: Plan; previews: { original: string; crop: string } };
type Method = "crop" | "expand";
type Phase = "idle" | "confirm" | "submitting" | "polling" | "completed" | "failed";
type Run = {
  requestId: string; endpointId: string; model: ModelKey; method: Method; prompt: string;
  startedAt: string; finishedAt?: string; videoUrl?: string; estimateUsd: number; error?: string; entryId?: string;
};

const STORAGE_KEY = "reelay.dev.product-clip.runs";
const usd = (n: number) => `$${n.toFixed(3)}`;
const DEFAULT_PROMPT =
  "Slow cinematic push-in on the product, soft studio light, gentle rotation, product stays sharp and unchanged, no text, no hands.";

export function ProductClipTestPanel({ keyPresent }: { keyPresent: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [method, setMethod] = useState<Method>("crop");

  const [expandPreview, setExpandPreview] = useState<string | null>(null);
  const [expandState, setExpandState] = useState<"idle" | "confirm" | "running">("idle");
  const [expandCost, setExpandCost] = useState<number | null>(null);

  const [model, setModel] = useState<ModelKey>(PROMO ? "minimax_turbo" : "kling_standard");
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<Run | null>(null);
  const [queueNote, setQueueNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    if (!run || (phase !== "submitting" && phase !== "polling")) return;
    const started = Date.parse(run.startedAt);
    const id = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => window.clearInterval(id);
  }, [run, phase]);

  useEffect(() => {
    if (phase !== "polling" || !run) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/dev/product-clip/jobs/${encodeURIComponent(run.requestId)}?endpoint=${encodeURIComponent(run.endpointId)}&entry=${encodeURIComponent(run.entryId ?? "")}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (stopped) return;
        if (body.status === "COMPLETED" || body.status === "FAILED") {
          const finished: Run = { ...run, finishedAt: new Date().toISOString(), videoUrl: body.videoUrl, error: body.error };
          setRun(finished);
          setPhase(body.status === "COMPLETED" ? "completed" : "failed");
          setMeterKey((k) => k + 1);
          setRuns((prev) => {
            const next = [finished, ...prev.filter((r) => r.requestId !== finished.requestId)].slice(0, 20);
            try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
        } else {
          setQueueNote(body.status === "IN_QUEUE" ? `In queue${body.queuePosition != null ? ` (position ${body.queuePosition})` : ""}` : "Generating…");
        }
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void tick();
    const id = window.setInterval(tick, 4000);
    return () => { stopped = true; window.clearInterval(id); };
  }, [phase, run]);

  async function prepare(file: File) {
    setError(null); setPrepared(null); setExpandPreview(null); setExpandCost(null); setExpandState("idle");
    setFileName(file.name); setPreparing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/dev/product-clip/prepare", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setPrepared(body as Prepared);
      setMethod((body as Prepared).plan.recommended);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  async function expand() {
    if (!prepared) return;
    setError(null); setExpandState("running");
    try {
      const res = await fetch("/api/dev/product-clip/expand", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: prepared.imageId, confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setExpandPreview(body.preview); setExpandCost(body.costUsd); setMethod("expand");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExpandState("idle");
      setMeterKey((k) => k + 1);
    }
  }

  async function startClip() {
    if (!prepared) return;
    setError(null); setPhase("submitting"); setQueueNote("Uploading image and submitting…");
    try {
      const res = await fetch("/api/dev/product-clip/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: prepared.imageId, method, model, prompt: effectivePrompt, confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRun({ requestId: body.requestId, endpointId: body.endpointId, model, method, prompt: effectivePrompt, startedAt: body.startedAt, estimateUsd: body.estimateUsd, entryId: body.entryId });
      setElapsed(0); setPhase("polling");
      setMeterKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message); setPhase("idle");
      setMeterKey((k) => k + 1);
    }
  }

  const clipEstimate = Math.round(MODELS[model].usdPerSecond * CLIP_SECONDS * 1000) / 1000;
  const methodReady = method === "crop" || Boolean(expandPreview);
  const busy = phase === "submitting" || phase === "polling";
  /* The grey example text is the real default: an empty field sends it. */
  const effectivePrompt = prompt.trim() || DEFAULT_PROMPT;
  const canStart = Boolean(prepared) && methodReady && !busy;
  const a = prepared?.analysis;
  const bboxStyle = a ? {
    left: `${(a.bbox.left / a.width) * 100}%`, top: `${(a.bbox.top / a.height) * 100}%`,
    width: `${(a.bbox.width / a.width) * 100}%`, height: `${(a.bbox.height / a.height) * 100}%`,
  } : undefined;
  const cropStyle = prepared ? {
    left: `${(prepared.plan.crop.left / prepared.analysis.width) * 100}%`, top: `${(prepared.plan.crop.top / prepared.analysis.height) * 100}%`,
    width: `${(prepared.plan.crop.width / prepared.analysis.width) * 100}%`, height: `${(prepared.plan.crop.height / prepared.analysis.height) * 100}%`,
  } : undefined;

  return (
    <div className="grid gap-8 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <SpendMeter refreshKey={meterKey} />
        {!keyPresent && (
          <Card>
            <CardContent className="pt-5 sm:pt-7">
              <p className="text-sm font-semibold text-danger">FAL_KEY is not set</p>
              <p className="mt-1 text-sm text-muted">Analysis and the smart crop work without it. Expansion and the clip need it; add it to <code>.env.local</code> and restart the dev server.</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: photo + analysis (free) */}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Step 1 · free</p>
            <CardTitle className="mt-2">Photo and framing</CardTitle>
            <p className="mt-1 text-[15px] text-muted">The product is located on its background; the box shows what was found, the frame shows the 9:16 crop.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={preparing || busy}>
                {preparing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {preparing ? "Analysing…" : prepared ? "Choose another photo" : "Choose product photo"}
              </Button>
              {fileName && <span className="text-sm text-muted">{fileName}</span>}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void prepare(f); e.target.value = ""; }} />
            </div>

            {prepared && a && (
              <>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div>
                    <p className="label-mono mb-2 text-muted">Original · {a.width}×{a.height}</p>
                    <div className="relative inline-block overflow-hidden rounded-tile bg-surface-muted shadow-card">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                      <img src={prepared.previews.original} alt="Original photo" className="block max-h-[360px] w-auto" />
                      {a.detected && <div className="pointer-events-none absolute border-2 border-success" style={bboxStyle} title="Detected product" />}
                      <div className="pointer-events-none absolute border-2 border-dashed border-accent" style={cropStyle} title="9:16 crop" />
                    </div>
                    <p className="mt-2 text-[13px] text-muted">
                      {a.detected
                        ? `Product found (green), covers ${Math.round(a.coverage * 100)}% of the frame.`
                        : "Could not separate the product from the background; the crop is centred."}{" "}
                      {prepared.plan.fits ? "It fits inside the 9:16 crop (orange)." : "It does not fit inside the 9:16 crop, so expansion is recommended."}
                    </p>
                  </div>
                  <div>
                    <p className="label-mono mb-2 text-muted">Recommended: {prepared.plan.recommended === "crop" ? "smart crop" : "AI expansion"}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <MethodTile
                        title="(a) Smart crop" note="Free" selected={method === "crop"} onSelect={() => setMethod("crop")} disabled={busy}
                        preview={prepared.previews.crop} warning={!prepared.plan.fits ? "Cuts the product" : undefined}
                      />
                      <MethodTile
                        title="(b) AI expansion" note={expandCost != null ? `Paid ${usd(expandCost)}` : `${usd(EXPAND_USD)} per image`}
                        selected={method === "expand"} onSelect={() => expandPreview && setMethod("expand")} disabled={busy || !expandPreview}
                        preview={expandPreview}
                        placeholder={
                          <Button size="sm" variant="secondary" className="h-auto flex-col gap-1 px-3 py-2 text-xs" onClick={() => setExpandState("confirm")} disabled={expandState !== "idle" || !keyPresent || busy}>
                            {expandState === "running" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
                            {expandState === "running" ? "Expanding…" : expandState === "confirm" ? "Confirm below" : "Preview"}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
                {/* The confirmation sits under the whole photo/tiles block at full card width: the tile column is too narrow for text, cost and two buttons. */}
                {expandState === "confirm" && (
                  <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink">
                      This sends the photo to Bria Expand, which paints only the missing top and bottom; the original pixels are pasted back. Cost about <strong>{usd(EXPAND_USD)}</strong>. Continue?
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" onClick={() => setExpandState("idle")}>Cancel</Button>
                      <Button variant="accent" onClick={expand}>Expand</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: model + prompt (paid) */}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Step 2 · paid</p>
            <CardTitle className="mt-2">Clip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(MODELS) as ModelKey[]).map((k) => (
                <button key={k} type="button" disabled={busy} onClick={() => setModel(k)} aria-pressed={model === k}
                  className={cn("rounded-[14px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                    model === k ? "border-accent bg-accent/5 shadow-card" : "border-border hover:bg-surface-muted")}>
                  <p className="text-[15px] font-semibold text-ink">{MODELS[k].label}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{MODELS[k].blurb}</p>
                  <p className="label-mono mt-3 text-muted">≈ {usd(MODELS[k].usdPerSecond)} / s · {usd(MODELS[k].usdPerSecond * CLIP_SECONDS)} per {CLIP_SECONDS} s</p>
                </button>
              ))}
            </div>
            <Field id="prompt" label="Motion prompt" hint="Describe camera and motion only. The product itself must stay unchanged. Leave empty to use the example shown.">
              <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} className="min-h-20" placeholder={DEFAULT_PROMPT} />
            </Field>
            <div className="rounded-[14px] bg-surface-muted p-4 text-sm">
              <p className="font-semibold text-ink">
                Estimated cost: {usd(clipEstimate)} <span className="font-normal text-muted">({CLIP_SECONDS} s × {usd(MODELS[model].usdPerSecond)}/s, fal.ai list price{expandCost != null ? `, plus ${usd(expandCost)} already spent on expansion` : ""})</span>
              </p>
              <p className="mt-1 text-[13px] text-muted">Source: {method === "expand" ? "AI-expanded" : "smart-cropped"} 9:16 image, 1080×1920. fal.ai has no balance endpoint; check the real charge in the fal.ai dashboard.</p>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {phase === "confirm" ? (
              <div className="flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">This creates one {CLIP_SECONDS}-second clip with <strong>{MODELS[model].label}</strong> for about <strong>{usd(clipEstimate)}</strong>. Continue?</p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" onClick={() => setPhase("idle")}>Cancel</Button>
                  <Button variant="accent" onClick={startClip}>Start clip</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted">{!prepared ? "Analyse a photo first." : !methodReady ? "Generate the expansion preview or switch to smart crop." : "You confirm the cost before anything is created."}</p>
                <Button variant="accent" size="lg" disabled={!canStart || !keyPresent} onClick={() => setPhase("confirm")}>
                  {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
                  {busy ? "Running…" : "Test product clip"}
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
            {run && <StatusBadge status={phase === "completed" ? "completed" : phase === "failed" ? "failed" : "processing"} />}
          </CardHeader>
          <CardContent className="space-y-4">
            {!run && <p className="text-sm text-muted">No clip yet.</p>}
            {run && busy && (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-tile bg-surface-muted">
                  <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">{queueNote}</div>
                </div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted">Elapsed</span><span className="label-mono text-ink">{Math.floor(elapsed / 60000)}:{String(Math.floor((elapsed / 1000) % 60)).padStart(2, "0")}</span></div>
                <p className="text-[13px] text-muted">Polling every 4 s (free). Usually one to three minutes.</p>
              </div>
            )}
            {run && phase === "failed" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-danger">The clip could not be generated</p>
                <p className="text-sm text-ink/80">{run.error}</p>
              </div>
            )}
            {run && phase === "completed" && run.videoUrl && (
              <div className="space-y-4">
                <VideoPlayer src={run.videoUrl} className="mx-auto w-full max-w-[240px]" />
                <div className="grid gap-2">
                  <Button href={run.videoUrl} variant="accent" download><Download className="size-4" aria-hidden />Download</Button>
                  <Button href={run.videoUrl} variant="secondary" target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden />Open in new tab</Button>
                </div>
                <dl className="divide-y divide-divider rounded-[14px] bg-surface-muted px-4 text-sm">
                  {([
                    ["Model", MODELS[run.model].label],
                    ["Framing", run.method === "expand" ? "AI expansion" : "Smart crop"],
                    ["Length", `${CLIP_SECONDS} s`],
                    ["Processing time", run.finishedAt ? `${Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000)} s` : "—"],
                    ["Estimated cost", usd(run.estimateUsd)],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>
                  ))}
                </dl>
                <p className="text-[13px] text-muted">fal.ai links are temporary; download the clip to keep it.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {runs.length > 0 && (
          <Card>
            <CardHeader className="flex items-start justify-between gap-3"><CardTitle>Compare runs</CardTitle><Badge tone="neutral">{runs.length}</Badge></CardHeader>
            <CardContent>
              <table className="w-full text-[13px]">
                <thead className="label-mono text-muted"><tr className="text-left"><th className="pb-2 font-normal">Model</th><th className="pb-2 font-normal">Framing</th><th className="pb-2 font-normal">Est.</th><th className="pb-2 font-normal">Result</th></tr></thead>
                <tbody className="divide-y divide-divider">
                  {runs.map((r) => (
                    <tr key={r.requestId} className="align-top">
                      <td className="py-2 pr-2 font-medium text-ink">{MODELS[r.model].label}</td>
                      <td className="py-2 pr-2 text-ink">{r.method}</td>
                      <td className="py-2 pr-2 text-ink">{usd(r.estimateUsd)}</td>
                      <td className="py-2">{r.videoUrl ? <a href={r.videoUrl} target="_blank" rel="noreferrer" className="text-ink underline decoration-border underline-offset-4">open</a> : <span className="text-danger">failed</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function MethodTile({ title, note, selected, onSelect, disabled, preview, warning, placeholder }: {
  title: string; note: string; selected: boolean; onSelect: () => void; disabled?: boolean;
  preview: string | null; warning?: string; placeholder?: React.ReactNode;
}) {
  const labels = (
    <>
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="text-[12px] text-muted">{note}</p>
    </>
  );
  return (
    <div className={cn("rounded-[14px] border p-2 transition-all", selected ? "border-accent bg-accent/5" : "border-border")}>
      {preview ? (
        /* A real preview: the whole tile is one select button. */
        <button type="button" onClick={onSelect} disabled={disabled} aria-pressed={selected}
          className="block w-full rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[10px] bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img src={preview} alt={title} className="size-full object-cover" />
            {warning && <span className="absolute left-2 top-2 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-danger shadow-card">{warning}</span>}
          </div>
          {labels}
        </button>
      ) : (
        /* No preview yet: the placeholder holds its own buttons, so no nested buttons here. */
        <div>
          <div className="relative aspect-[9/16] overflow-hidden rounded-[10px] bg-surface-muted">
            <div className="absolute inset-0 grid place-items-center p-2">{placeholder}</div>
          </div>
          {labels}
        </div>
      )}
    </div>
  );
}
