"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ExternalLink, Loader2, Play, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { controlClass, controlStateClass } from "@/components/ui/Field";
import { SpendMeter } from "@/components/dev/SpendMeter";

/* Mirrors the constants in src/lib/services/heygen.ts (that file is server-only). */
const MAX_CHARS = 160;
const RATE: Record<Engine, number> = { avatar_iv: 0.05, avatar_iii: 0.0083 };

type Engine = "avatar_iii" | "avatar_iv";
type Balance = { amount: number; unit: "usd" | "credits" } | null;
type Look = {
  id: string;
  name: string;
  gender?: string;
  preview_image_url?: string;
  supported_api_engines?: string[];
  default_voice_id?: string;
  image_width?: number | null;
  image_height?: number | null;
  orientation: "portrait" | "landscape" | "square" | "unknown";
  bothEngines: boolean;
};
type Voice = { voice_id: string; name: string; language?: string; gender?: string; preview_audio_url?: string };
type Inventory = {
  total: number; portrait: number; landscape: number; square: number; unknown: number; portraitBothEngines: number;
  portraitByGender: { female: number; male: number; other: number };
  portraitBothEnginesByGender: { female: number; male: number };
};
type Options = { looks: Look[]; inventory: Inventory; voices: Voice[]; account: { billingType: string | null; balance: Balance } };

type Phase = "idle" | "confirm" | "creating" | "polling" | "completed" | "failed";

type Run = {
  id: string;
  engine: Engine;
  lookName: string;
  voiceName: string;
  script: string;
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number | null;
  videoUrl?: string | null;
  balanceBefore: Balance;
  balanceAfter?: Balance;
  failureMessage?: string | null;
  /** Cost-guard entry, settled with the real cost once the balance difference is known. */
  entryId?: string;
};

const STORAGE_KEY = "reelay.dev.heygen.runs";
const ENGINE_META: Record<Engine, { label: string; blurb: string }> = {
  avatar_iv: { label: "Avatar IV", blurb: "Newest look and motion. Default engine." },
  avatar_iii: { label: "Avatar III", blurb: "Older engine. List price 6× cheaper; measured 2026-10-19 only ~2× (see pricing.ts)." },
};

function estimateSeconds(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 2.5));
}
function usd(n: number) {
  return `$${n.toFixed(3)}`;
}
function fmtBalance(b: Balance) {
  if (!b) return "not available";
  return b.unit === "usd" ? `$${b.amount.toFixed(2)}` : `${b.amount.toFixed(2)} credits`;
}
function costBetween(before: Balance, after: Balance | undefined) {
  if (!before || !after || before.unit !== after.unit) return null;
  const diff = Math.round((before.amount - after.amount) * 1000) / 1000;
  return { amount: diff, unit: before.unit };
}
function fmtSeconds(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function HeygenTestPanel() {
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [engine, setEngine] = useState<Engine>("avatar_iv");
  const [lookId, setLookId] = useState("");
  /* The ad needs a portrait look (a landscape one comes back letterboxed in 9:16), so the filter is on by default. */
  const [portraitOnly, setPortraitOnly] = useState(true);
  const [voiceId, setVoiceId] = useState("");
  const [script, setScript] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<Run | null>(null);
  const [heygenStatus, setHeygenStatus] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [meterKey, setMeterKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const persistRun = useCallback((finished: Run) => {
    setRuns((prev) => {
      const next = [finished, ...prev.filter((r) => r.id !== finished.id)].slice(0, 20);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* ---- load free data once ---- */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/heygen/options")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as Options;
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          if (stored) setRuns(JSON.parse(stored) as Run[]);
        } catch {
          /* ignore */
        }
        const firstLook = data.looks.find((l) => l.orientation === "portrait" && (!l.supported_api_engines || l.supported_api_engines.includes("avatar_iv")));
        if (firstLook) setLookId(firstLook.id);
        const firstVoice = data.voices[0];
        if (firstVoice) setVoiceId(firstVoice.voice_id);
      })
      .catch((e: Error) => {
        if (!cancelled) setOptionsError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- elapsed clock while a run is active ---- */
  useEffect(() => {
    if (!run || (phase !== "creating" && phase !== "polling")) return;
    const started = Date.parse(run.startedAt);
    const id = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => window.clearInterval(id);
  }, [run, phase]);

  /* ---- poll status every 5 s (free) ---- */
  useEffect(() => {
    if (phase !== "polling" || !run) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/dev/heygen/videos/${encodeURIComponent(run.id)}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (stopped) return;
        setHeygenStatus(body.status);
        if (body.status === "completed" || body.status === "failed") {
          const finished: Run = {
            ...run,
            finishedAt: new Date().toISOString(),
            durationSeconds: body.duration,
            videoUrl: body.videoUrl,
            balanceAfter: body.balance,
            failureMessage: body.failureMessage,
          };
          setRun(finished);
          setPhase(body.status);
          persistRun(finished);
          // Report the real cost (balance difference) to the cost log, then refresh the meter.
          const actual = costBetween(finished.balanceBefore, finished.balanceAfter);
          if (finished.entryId) {
            void fetch("/api/dev/cost/settle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entryId: finished.entryId,
                status: body.status === "completed" ? "completed" : "failed",
                actualUsd: body.status === "failed" ? 0 : actual && actual.unit === "usd" ? actual.amount : null,
              }),
            }).finally(() => setMeterKey((k) => k + 1));
          }
        }
      } catch (e) {
        if (!stopped) setActionError((e as Error).message);
      }
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [phase, run, persistRun]);

  const look = options?.looks.find((l) => l.id === lookId);
  const voice = options?.voices.find((v) => v.voice_id === voiceId);
  const seconds = useMemo(() => estimateSeconds(script), [script]);
  const estimate = Math.round(RATE[engine] * seconds * 1000) / 1000;
  const scriptTooLong = script.trim().length === 0 || script.length > MAX_CHARS;
  const lookSupportsEngine = !look?.supported_api_engines || look.supported_api_engines.includes(engine);
  const busy = phase === "creating" || phase === "polling";
  const canStart = !!options && !!look && !!voice && !scriptTooLong && lookSupportsEngine && !busy;

  async function startVideo() {
    if (!look || !voice) return;
    setActionError(null);
    setPhase("creating");
    try {
      const res = await fetch("/api/dev/heygen/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId, voiceId, engine, script: script.trim(), confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRun({
        id: body.videoId,
        engine,
        lookName: look.name,
        voiceName: voice.name,
        script: script.trim(),
        startedAt: body.startedAt,
        balanceBefore: body.balanceBefore,
        entryId: body.entryId,
      });
      setMeterKey((k) => k + 1);
      setHeygenStatus(body.status);
      setElapsed(0);
      setPhase("polling");
    } catch (e) {
      setActionError((e as Error).message);
      setPhase("idle");
    }
  }

  function toggleVoicePreview(v: Voice) {
    if (!v.preview_audio_url) return;
    if (playingVoice === v.voice_id) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(v.preview_audio_url);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    void audio.play();
    setPlayingVoice(v.voice_id);
  }

  /* ---------- render ---------- */

  if (optionsError) {
    return (
      <Card>
        <CardContent className="pt-7">
          <p className="text-sm font-semibold text-danger">Could not load HeyGen data</p>
          <p className="mt-1 text-sm text-muted">{optionsError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!options) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <SpendMeter refreshKey={meterKey} />
        {/* Account */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5 sm:pt-7">
            <div>
              <p className="label-mono text-muted">HeyGen balance</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{fmtBalance(options.account.balance)}</p>
            </div>
            <div className="text-right text-sm text-muted">
              <p>Billing: {options.account.billingType ?? "unknown"}</p>
              <p>{options.looks.length} avatars · {options.voices.length} voices loaded (free)</p>
            </div>
          </CardContent>
        </Card>

        {/* 1. Engine */}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Step 1</p>
            <CardTitle className="mt-2">Engine</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(["avatar_iv", "avatar_iii"] as Engine[]).map((e) => (
              <button
                key={e}
                type="button"
                disabled={busy}
                onClick={() => setEngine(e)}
                aria-pressed={engine === e}
                className={cn(
                  "rounded-[14px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                  engine === e ? "border-accent bg-accent/5 shadow-card" : "border-border hover:bg-surface-muted",
                )}
              >
                <p className="text-[15px] font-semibold text-ink">{ENGINE_META[e].label}</p>
                <p className="mt-0.5 text-[13px] text-muted">{ENGINE_META[e].blurb}</p>
                <p className="label-mono mt-3 text-muted">≈ {usd(RATE[e])} / second</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 2. Avatar */}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Step 2</p>
            <CardTitle className="mt-2">Avatar</CardTitle>
            <p className="mt-1 text-[15px] text-muted">
              Public looks. Greyed-out ones do not support {ENGINE_META[engine].label} or are landscape (the ad needs portrait: a landscape look renders with grey bars in 9:16).
            </p>
            <p className="mt-2 text-[13px] text-muted">
              {options.inventory.total} looks: {options.inventory.portrait} portrait ({options.inventory.portraitBothEngines} on both engines; {options.inventory.portraitByGender.female} female, {options.inventory.portraitByGender.male} male), {options.inventory.landscape} landscape, {options.inventory.square} square{options.inventory.unknown ? `, ${options.inventory.unknown} unknown` : ""}.
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={portraitOnly} onChange={(e) => setPortraitOnly(e.target.checked)} className="size-4 accent-ink" />
              Portrait only
            </label>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4 md:grid-cols-5">
              {options.looks.filter((l) => !portraitOnly || l.orientation === "portrait").map((l) => {
                const supported = (!l.supported_api_engines || l.supported_api_engines.includes(engine)) && l.orientation === "portrait";
                const selected = l.id === lookId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={busy || !supported}
                    onClick={() => setLookId(l.id)}
                    aria-pressed={selected}
                    title={supported ? l.name : `${l.name} — not available on ${ENGINE_META[engine].label}`}
                    className={cn(
                      "group relative overflow-hidden rounded-tile bg-surface-muted text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      selected ? "ring-2 ring-accent" : "hover:shadow-card",
                      !supported && "opacity-35",
                    )}
                  >
                    <div className="aspect-[3/4]">
                      {l.preview_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external preview
                        <img src={l.preview_image_url} alt={l.name} className="size-full object-cover" />
                      ) : null}
                    </div>
                    <p className="truncate px-2 pt-1.5 text-xs font-medium text-ink">{l.name}</p>
                    <p className={cn("label-mono px-2 pb-1.5", l.orientation === "portrait" ? "text-success" : "text-warning")}>{l.orientation}{l.bothEngines ? " · III+IV" : ""}</p>
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-white">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 3. Voice + script */}
        <Card>
          <CardHeader>
            <p className="label-mono text-muted">Step 3</p>
            <CardTitle className="mt-2">Voice and script</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Field id="voice" label="Voice" hint="English public voices. Previews are free.">
              <div className="flex gap-2">
                <select
                  id="voice"
                  value={voiceId}
                  disabled={busy}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className={cn(controlClass, controlStateClass(false), "h-11 flex-1")}
                >
                  {options.voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                      {v.gender ? ` · ${v.gender}` : ""}
                      {v.language ? ` · ${v.language}` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => voice && toggleVoicePreview(voice)}
                  disabled={!voice?.preview_audio_url}
                  aria-label={playingVoice === voiceId ? "Stop preview" : "Play voice preview"}
                >
                  {playingVoice === voiceId ? <Square className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                  Preview
                </Button>
              </div>
            </Field>

            <Field
              id="script"
              label="Script"
              hint={`${script.length} / ${MAX_CHARS} characters ≈ ${seconds} s of speech`}
              error={script.length > MAX_CHARS ? `Keep it under ${MAX_CHARS} characters so the test stays under ~10 seconds.` : undefined}
            >
              <Textarea
                id="script"
                value={script}
                disabled={busy}
                invalid={script.length > MAX_CHARS}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-24"
                placeholder="e.g. Hi! This is a quick test of our presenter step. If you can hear me clearly, the connection works."
              />
            </Field>

            <div className="rounded-[14px] bg-surface-muted p-4 text-sm">
              <p className="font-semibold text-ink">
                Estimated cost: {usd(estimate)} <span className="font-normal text-muted">({seconds} s × {usd(RATE[engine])}/s, indicative)</span>
              </p>
              <p className="mt-1 text-[13px] text-muted">
                Real cost is measured from your balance before and after. 9:16, 720p, no captions.
              </p>
            </div>

            {actionError && (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            )}

            {/* Start + inline confirmation (the only paid action) */}
            {phase === "confirm" ? (
              <div className="flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink">
                  This creates one real video with <strong>{look?.name}</strong> on {ENGINE_META[engine].label} for about{" "}
                  <strong>{usd(estimate)}</strong>. Continue?
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" onClick={() => setPhase("idle")}>
                    Cancel
                  </Button>
                  <Button variant="accent" onClick={startVideo}>
                    Start video
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted">
                  {!lookSupportsEngine ? "The selected avatar does not support this engine." : "You confirm the cost before anything is created."}
                </p>
                <Button variant="accent" size="lg" disabled={!canStart} onClick={() => setPhase("confirm")}>
                  {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
                  {busy ? "Running…" : "Test HeyGen"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: current run + history */}
      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <CardTitle>Result</CardTitle>
            {run && <StatusBadge status={phase === "completed" ? "completed" : phase === "failed" ? "failed" : "processing"} />}
          </CardHeader>
          <CardContent className="space-y-4">
            {!run && <p className="text-sm text-muted">No video yet. The real result appears here.</p>}

            {run && (phase === "creating" || phase === "polling") && (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-tile bg-surface-muted">
                  <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
                    HeyGen is rendering… status: {heygenStatus || "pending"}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Elapsed</span>
                  <span className="label-mono text-ink">{fmtSeconds(elapsed)}</span>
                </div>
                <p className="text-[13px] text-muted">Polling every 5 s (free). A 10 s clip usually takes one to three minutes.</p>
              </div>
            )}

            {run && phase === "failed" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-danger">HeyGen could not finish this video</p>
                <p className="text-sm text-ink/80">{run.failureMessage ?? "No reason given."}</p>
                <Button size="sm" onClick={() => setPhase("confirm")}>
                  <RotateCcw className="size-4" aria-hidden />
                  Try again (new cost)
                </Button>
              </div>
            )}

            {run && phase === "completed" && run.videoUrl && (
              <div className="space-y-4">
                <VideoPlayer src={run.videoUrl} className="mx-auto w-full max-w-[240px]" />
                <div className="grid gap-2">
                  <Button href={run.videoUrl} variant="accent" download>
                    <Download className="size-4" aria-hidden />
                    Download
                  </Button>
                  <Button href={run.videoUrl} variant="secondary" target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden />
                    Open in new tab
                  </Button>
                </div>
                <RunStats run={run} />
                <p className="text-[13px] text-muted">The link is temporary; download it now if you want to keep it.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {runs.length > 0 && (
          <Card>
            <CardHeader className="flex items-start justify-between gap-3">
              <CardTitle>Compare runs</CardTitle>
              <Badge tone="neutral">{runs.length}</Badge>
            </CardHeader>
            <CardContent>
              <table className="w-full text-[13px]">
                <thead className="label-mono text-muted">
                  <tr className="text-left">
                    <th className="pb-2 font-normal">Engine</th>
                    <th className="pb-2 font-normal">Length</th>
                    <th className="pb-2 font-normal">Est.</th>
                    <th className="pb-2 font-normal">Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {runs.map((r) => {
                    const actual = costBetween(r.balanceBefore, r.balanceAfter);
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="py-2 pr-2">
                          <p className="font-medium text-ink">{ENGINE_META[r.engine].label}</p>
                          <p className="text-muted">{r.lookName}</p>
                          {r.videoUrl && (
                            <a href={r.videoUrl} target="_blank" rel="noreferrer" className="text-ink underline decoration-border underline-offset-4">
                              open
                            </a>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-ink">{r.durationSeconds != null ? `${Math.round(r.durationSeconds)} s` : "—"}</td>
                        <td className="py-2 pr-2 text-ink">
                          {r.durationSeconds != null ? usd(Math.round(RATE[r.engine] * r.durationSeconds * 1000) / 1000) : "—"}
                        </td>
                        <td className="py-2 text-ink">{actual ? fmtBalance(actual) : "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function RunStats({ run }: { run: Run }) {
  const processing =
    run.finishedAt && run.startedAt ? Date.parse(run.finishedAt) - Date.parse(run.startedAt) : null;
  const est = run.durationSeconds != null ? Math.round(RATE[run.engine] * run.durationSeconds * 1000) / 1000 : null;
  const actual = costBetween(run.balanceBefore, run.balanceAfter);
  const rows: [string, string][] = [
    ["Engine", ENGINE_META[run.engine].label],
    ["Avatar · voice", `${run.lookName} · ${run.voiceName}`],
    ["Video length", run.durationSeconds != null ? `${run.durationSeconds.toFixed(1)} s` : "unknown"],
    ["Processing time", processing != null ? fmtSeconds(processing) : "—"],
    ["Estimated cost", est != null ? usd(est) : "—"],
    ["Actual cost (balance diff)", actual ? fmtBalance(actual) : "not measurable on this billing type"],
    ["Balance now", fmtBalance(run.balanceAfter ?? null)],
  ];
  return (
    <dl className="divide-y divide-divider rounded-[14px] bg-surface-muted px-4 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
