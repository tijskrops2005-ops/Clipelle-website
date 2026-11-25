"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDuration } from "@/components/ui/VideoDropzone";
import { FilePicker, JobRow, SourceCard, type Picked } from "@/components/enhance/EnhanceView";
import { startToolJob, useEnhanceJobs, useToolSource } from "@/lib/data/enhanceClient";
import { CAPTION_PRESETS } from "@/lib/editRecipe";
import { MEDIA_CREDITS, MEDIA_MAX_SECONDS, MEDIA_TOOLS, mediaCredits, type MediaToolKey, type MediaToolOptions } from "@/lib/mediaTools";

/**
 * One page for each single-step media tool (25 Nov 2026): a file, the tool's few choices, the rights
 * confirmation, the credits on the button and in an inline confirmation, then the result in "Your
 * files" with a before/after view and Download. Same pieces as the enhancer.
 */
export function MediaToolView({ tool }: { tool: MediaToolKey }) {
  const meta = MEDIA_TOOLS[tool];
  const { jobs, ready, error: loadError } = useEnhanceJobs(tool);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [options, setOptions] = useState<MediaToolOptions>({ preset: "bold", position: "low", format: "9:16", mode: "fill" });
  const [rights, setRights] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  // A finished file from another tool or a project (?from=…), instead of an upload (25 Nov 2026).
  const { source, error: sourceError } = useToolSource(params.get("from"));
  const fromSource = source && source.media === meta.media ? source : null;
  const current = fromSource
    ? { name: fromSource.fileName, seconds: fromSource.seconds ?? undefined, width: fromSource.width ?? undefined, height: fromSource.height ?? undefined }
    : picked
      ? { name: picked.file.name, seconds: picked.seconds, width: picked.width, height: picked.height }
      : null;

  const tooLong = meta.media === "video" && current?.seconds !== undefined && current.seconds > MEDIA_MAX_SECONDS + 0.5;
  const credits = current ? (meta.media === "video" ? (current.seconds ? mediaCredits(tool, current.seconds) : null) : mediaCredits(tool)) : null;
  const canStart = Boolean(current && rights && (credits !== null || fromSource) && !tooLong && !busy);
  const rate = tool === "remove-text" ? "1 credit per second" : tool === "remove-background" ? `${MEDIA_CREDITS["remove-background"].perImage} credits per image` : tool === "transcribe" ? "1 credit per 5 seconds" : "1 credit per 2 seconds";
  const set = (patch: MediaToolOptions) => setOptions((o) => ({ ...o, ...patch }));

  async function start() {
    if (!current) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await startToolJob({ tool, file: picked?.file, source: fromSource ?? undefined, seconds: current.seconds, width: current.width, height: current.height, options }, setProgress);
      setPicked(null);
      if (fromSource) router.replace(`/app/tools/${tool}`, { scroll: false });
      setRights(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This could not start. Try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-label={meta.title} className="rounded-card bg-surface p-5 shadow-card sm:p-6">
        {fromSource ? (
          <SourceCard source={fromSource} onClear={() => router.replace(`/app/tools/${tool}`, { scroll: false })} disabled={busy} />
        ) : (
          <FilePicker kind={meta.media} picked={picked} onPick={(p) => { setPicked(p); setConfirming(false); setError(null); }} onReject={setError} disabled={busy} />
        )}
        {sourceError && !fromSource && <p className="mt-2 text-[12.5px] text-danger">{sourceError}</p>}
        <p className="mt-2 text-[12.5px] text-muted">
          {meta.media === "video" ? `MP4, MOV or WebM, up to ${config.limits.translateVideoMaxMb} MB and ${MEDIA_MAX_SECONDS / 60} minutes. ${rate}.` : `JPG, PNG or WebP, up to 10 MB. ${rate}.`}
        </p>

        {tool === "captions" && (
          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Style</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Caption style">
                {CAPTION_PRESETS.map((p) => (
                  <button key={p.key} type="button" role="radio" aria-checked={options.preset === p.key} onClick={() => set({ preset: p.key })} disabled={busy} className={cn("focus-ring rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors", options.preset === p.key ? "border-ink bg-ink text-white" : "border-border bg-surface text-ink hover:bg-surface-muted")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice label="Position" value={options.position ?? "low"} options={[{ key: "low", label: "Low" }, { key: "middle", label: "Middle" }]} onChange={(k) => set({ position: k as "low" | "middle" })} disabled={busy} />
              <Choice label="Size" value={options.format ?? "9:16"} options={[{ key: "9:16", label: "9:16" }, { key: "original", label: "Original" }]} onChange={(k) => set({ format: k as "9:16" | "original" })} disabled={busy} />
            </div>
            <p className="text-[12.5px] text-muted">The captions follow what is said, in the language of the video.</p>
          </div>
        )}

        {tool === "resize" && (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-ink">How to fit</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard selected={options.mode !== "fit"} onSelect={() => set({ mode: "fill" })} title="Fill the frame" description="The picture fills 9:16; the sides are cut off." disabled={busy} />
              <OptionCard selected={options.mode === "fit"} onSelect={() => set({ mode: "fit" })} title="Whole picture" description="Everything stays in view, over a blurred copy of the video." disabled={busy} />
            </div>
          </fieldset>
        )}

        <label className="mt-5 flex items-start gap-3 text-[13.5px] text-ink">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} disabled={busy} className="mt-0.5 size-4 accent-ink" />
          I own this file or have permission to use it.
        </label>

        {tooLong && <p className="mt-4 rounded-panel bg-warning/10 px-3 py-2 text-[13px] text-ink" role="alert">A video can be up to {MEDIA_MAX_SECONDS / 60} minutes here. This one is {formatDuration(current!.seconds!)}.</p>}
        {error && <p className="mt-4 rounded-panel bg-danger/10 px-3 py-2 text-[13px] text-danger" role="alert">{error}</p>}

        {!confirming ? (
          <Button type="button" variant="accent" size="lg" className="mt-5 w-full" disabled={!canStart} onClick={() => setConfirming(true)}>
            <Sparkles className="size-4" aria-hidden />
            {credits === null ? meta.title : `${meta.title} · ${credits} credits`}
          </Button>
        ) : (
          <div className="mt-5 rounded-panel border border-border bg-surface-muted p-4" role="group" aria-label="Confirm">
            <p className="text-[14px] text-ink">
              {meta.title} for <span className="font-medium">{current?.name}</span>, <span className="font-semibold tabular-nums">{credits === null ? "the credits shown once it is read" : `${credits} credits`}</span>?
            </p>
            {progress !== null && progress < 1 && <p className="mt-2 text-[13px] text-muted" role="status">Uploading {Math.round(progress * 100)}%</p>}
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="accent" onClick={start} disabled={busy}>{busy ? "Starting…" : "Confirm"}</Button>
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        )}
        {config.demoMode && <p className="mt-3 text-[12.5px] text-muted">Demo mode: nothing is uploaded or charged, and the result is your original file.</p>}
      </section>

      <section aria-labelledby="tool-files" className="min-w-0 rounded-card bg-surface shadow-card">
        <h2 id="tool-files" className="px-5 pt-5 text-[17px] font-semibold text-ink sm:px-6">Your files</h2>
        {loadError && <p className="px-5 pt-3 text-[13px] text-danger sm:px-6">{loadError}</p>}
        {!ready ? (
          <div className="space-y-3 p-5 sm:p-6">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-[14px] bg-surface-muted text-ink" aria-hidden><ImageUp className="size-6" /></span>
            <p className="mt-2 text-[15px] font-medium text-ink">Nothing here yet</p>
            <p className="max-w-xs text-[13.5px] text-muted">Add a {meta.media === "video" ? "video" : "photo"} on the left; the result appears here.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2 px-3 pb-3 sm:px-4">
            {jobs.map((j) => <JobRow key={j.id} job={j} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function Choice({ label, value, options, onChange, disabled }: { label: string; value: string; options: { key: string; label: string }[]; onChange: (k: string) => void; disabled?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="flex gap-1 rounded-full bg-surface-muted p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)} disabled={disabled} className={cn("focus-ring h-8 flex-1 rounded-full text-[13.5px] font-medium transition-colors", value === o.key ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
