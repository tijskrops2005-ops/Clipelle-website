"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, controlClass, controlStateClass } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SpendMeter } from "@/components/dev/SpendMeter";

type Estimate = { inputTokens: number; outputTokens: number; costUsd: number };
type Scene = { kind: string; seconds: number; onScreenText: string | null };
type AdScript = {
  angle: string;
  language: string;
  hook: { spoken: string; onScreen: string };
  presenterScript: string;
  scenes: Scene[];
  benefits: string[];
  offer: { headline: string; cta: string };
  musicMood: string;
};
type RunResult = {
  script: AdScript;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  costUsd: number;
  estimate: Estimate;
  elapsedMs: number;
};

const STORAGE_KEY = "reelay.dev.script.last";
const usd = (n: number) => `$${n.toFixed(4)}`;

/** Downscale a chosen image in the browser so the request stays small and cheap. */
async function fileToDataUrl(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ScriptTestPanel({ keyPresent }: { keyPresent: boolean }) {
  const [productName, setProductName] = useState("Glow Vitamin C Serum");
  const [description, setDescription] = useState(
    "A lightweight vitamin C serum that brightens dull skin in 14 days. Vegan, fragrance-free, 30 ml glass bottle with dropper.",
  );
  const [productUrl, setProductUrl] = useState("");
  const [hint, setHint] = useState("");
  const [language, setLanguage] = useState("en");
  const [targetSeconds, setTargetSeconds] = useState(30);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [phase, setPhase] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [meterKey, setMeterKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const payload = { productName, description, productUrl, hint, language, targetSeconds, imageDataUrl };

  /* Free estimate, refreshed when inputs change (debounced). */
  useEffect(() => {
    const id = window.setTimeout(() => {
      fetch("/api/dev/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, estimateOnly: true }),
      })
        .then((r) => r.json())
        .then((b) => setEstimate(b.estimate ?? null))
        .catch(() => setEstimate(null));
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName, description, productUrl, hint, language, targetSeconds, imageDataUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setResult(JSON.parse(stored) as RunResult);
          setPhase("done");
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  async function run() {
    setError(null);
    setPhase("running");
    try {
      const res = await fetch("/api/dev/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setResult(body as RunResult);
      setPhase("done");
      setMeterKey((k) => k + 1);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
      setMeterKey((k) => k + 1);
    }
  }

  const busy = phase === "running";
  const valid = productName.trim().length >= 2 && description.trim().length >= 20;

  return (
    <div className="grid gap-8 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <SpendMeter refreshKey={meterKey} />
        {!keyPresent && (
          <Card>
            <CardContent className="pt-5 sm:pt-7">
              <p className="text-sm font-semibold text-danger">ANTHROPIC_API_KEY is not set</p>
              <p className="mt-1 text-sm text-muted">
                Add it to <code>.env.local</code> and restart the dev server. The form works, the call will fail.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Input</p>
            <CardTitle className="mt-2">Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field id="photo" label="Product photo" hint="Optional. Downscaled in the browser to 1024 px; adds about 1,600 input tokens.">
              {imageDataUrl ? (
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={imageDataUrl} alt="Product preview" className="h-32 w-24 rounded-[10px] object-cover shadow-card" />
                  <Button variant="secondary" size="sm" onClick={() => setImageDataUrl(null)} disabled={busy}>
                    <X className="size-4" aria-hidden />
                    Remove
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <ImagePlus className="size-4" aria-hidden />
                  Choose photo
                </Button>
              )}
              <input
                ref={fileRef}
                id="photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setImageDataUrl(await fileToDataUrl(f));
                  e.target.value = "";
                }}
              />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="productName" label="Product name">
                <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} disabled={busy} />
              </Field>
              <Field id="productUrl" label="Product URL" optional>
                <Input id="productUrl" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} disabled={busy} placeholder="https://…" />
              </Field>
            </div>
            <Field id="description" label="Description" hint="Only facts in here may end up in the script.">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
            </Field>
            <Field id="hint" label="Direction" optional hint="Audience, tone, something to emphasise.">
              <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} disabled={busy} placeholder="e.g. women 25–40, calm and confident tone" />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="language" label="Language">
                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy} className={cn(controlClass, controlStateClass(false), "h-11")}>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="de">Deutsch</option>
                </select>
              </Field>
              <Field id="length" label="Ad length">
                <select id="length" value={targetSeconds} onChange={(e) => setTargetSeconds(Number(e.target.value))} disabled={busy} className={cn(controlClass, controlStateClass(false), "h-11")}>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                </select>
              </Field>
            </div>

            <div className="rounded-[14px] bg-surface-muted p-4 text-sm">
              <p className="font-semibold text-ink">
                Estimated cost: {estimate ? usd(estimate.costUsd) : "…"}{" "}
                <span className="font-normal text-muted">
                  ({estimate ? `${estimate.inputTokens.toLocaleString()} in / ${estimate.outputTokens} out tokens` : "calculating"}, claude-opus-5-5 at $4 / $20 per million)
                </span>
              </p>
              <p className="mt-1 text-[13px] text-muted">The real cost is calculated from the usage the API reports back.</p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            {phase === "confirm" ? (
              <div className="flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">
                  This sends the product info{imageDataUrl ? " and the photo" : ""} to Claude for about <strong>{estimate ? usd(estimate.costUsd) : "a few cents"}</strong>. Continue?
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" onClick={() => setPhase("idle")}>Cancel</Button>
                  <Button variant="accent" onClick={run}>Generate script</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted">You confirm the cost before anything is sent.</p>
                <Button variant="accent" size="lg" disabled={!valid || busy} onClick={() => setPhase("confirm")}>
                  {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
                  {busy ? "Writing…" : "Test script"}
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
            {result && <Badge tone="success">Done</Badge>}
          </CardHeader>
          <CardContent className="space-y-5">
            {!result && <p className="text-sm text-muted">No script yet.</p>}
            {result && (
              <>
                <Section label="Hook (on screen)">
                  <p className="text-xl font-semibold leading-tight text-ink">{result.script.hook.onScreen}</p>
                  <p className="mt-1 text-sm text-muted">Spoken: “{result.script.hook.spoken}”</p>
                </Section>
                <Section label="Presenter script">
                  <p className="text-sm leading-relaxed text-ink/90">{result.script.presenterScript}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {result.script.presenterScript.trim().split(/\s+/).length} words ≈{" "}
                    {Math.round(result.script.presenterScript.trim().split(/\s+/).length / 2.5)} s
                  </p>
                </Section>
                <Section label="Scenes">
                  <ul className="divide-y divide-divider text-sm">
                    {result.script.scenes.map((s, i) => (
                      <li key={i} className="flex justify-between gap-3 py-1.5">
                        <span className="text-ink">
                          <span className="label-mono mr-2 text-muted">{s.kind}</span>
                          {s.onScreenText ?? <span className="text-muted">—</span>}
                        </span>
                        <span className="shrink-0 text-muted">{s.seconds} s</span>
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section label="Benefits">
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink/90">
                    {result.script.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </Section>
                <Section label="Offer">
                  <p className="text-sm font-semibold text-ink">{result.script.offer.headline}</p>
                  <p className="text-sm text-muted">Button: {result.script.offer.cta} · Music: {result.script.musicMood}</p>
                </Section>
                <dl className="divide-y divide-divider rounded-[14px] bg-surface-muted px-4 text-sm">
                  {(
                    [
                      ["Model", result.model],
                      ["Tokens in / out", `${result.usage.inputTokens.toLocaleString()} / ${result.usage.outputTokens.toLocaleString()}`],
                      ["Estimated cost", usd(result.estimate.costUsd)],
                      ["Actual cost", usd(result.costUsd)],
                      ["Time", `${(result.elapsedMs / 1000).toFixed(1)} s`],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowRaw((v) => !v)}>
                    {showRaw ? "Hide JSON" : "Show JSON"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(result.script, null, 2))}
                  >
                    <Copy className="size-4" aria-hidden />
                    Copy JSON
                  </Button>
                </div>
                {showRaw && (
                  <pre className="max-h-80 overflow-auto rounded-[14px] bg-ink p-4 text-xs leading-relaxed text-surface">
                    {JSON.stringify(result.script, null, 2)}
                  </pre>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono mb-1.5 text-muted">{label}</p>
      {children}
    </div>
  );
}
