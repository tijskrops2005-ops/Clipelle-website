"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, ImageUp, Sparkles, Upload, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBytes, formatDuration } from "@/components/ui/VideoDropzone";
import { enhanceDownloadHref, startEnhance, useEnhanceJobs, useToolSource, type EnhanceJobView, type ToolSource } from "@/lib/data/enhanceClient";
import { MEDIA_TOOLS, isMediaToolKey, nextToolsFor, optionsLabel } from "@/lib/mediaTools";
import Link from "next/link";
import { ENHANCE_CREDITS, IMAGE_MAX_BYTES, IMAGE_TARGETS, IMAGE_TYPES, VIDEO_TARGETS, VIDEO_TYPES, imageCredits, imageOutput, videoCredits, videoOutput, type EnhanceKind, type ImageTarget, type VideoTarget } from "@/lib/enhanceRules";

const VIDEO_MAX_MB = config.limits.translateVideoMaxMb;
export type Picked = { file: File; url: string; seconds?: number; width?: number; height?: number };

/**
 * The enhancer (25 Nov 2026, Tijs): a video or a product photo in, a sharper, bigger file out. One
 * upload, one size choice with its credits, the rights confirmation, an inline confirmation with the
 * same number, then the file appears in "Your enhanced files" with a before/after view and Download.
 */
export function EnhanceView() {
  const router = useRouter();
  const params = useSearchParams();
  const kind: EnhanceKind = params.get("type") === "image" ? "image" : "video";
  const { jobs, limits, ready, error: loadError } = useEnhanceJobs();
  // A file belongs to the tab it was picked on: switching between video and image starts clean.
  const [pickedState, setPicked] = useState<(Picked & { kind: EnhanceKind }) | null>(null);
  const picked = pickedState?.kind === kind ? pickedState : null;
  const [videoTarget, setVideoTarget] = useState<VideoTarget>("1080p");
  const [imageTarget, setImageTarget] = useState<ImageTarget>("2x");
  const [rights, setRights] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A finished file from another tool or a project (?from=job:… / project:…), instead of an upload (25 Nov 2026).
  const { source, error: sourceError } = useToolSource(params.get("from"));
  const fromSource = source && source.media === kind ? source : null;
  const current = fromSource
    ? { name: fromSource.fileName, seconds: fromSource.seconds ?? undefined, width: fromSource.width ?? undefined, height: fromSource.height ?? undefined }
    : picked
      ? { name: picked.file.name, seconds: picked.seconds, width: picked.width, height: picked.height }
      : null;

  const maxSeconds = limits?.maxSeconds[videoTarget];
  const tooLong = kind === "video" && current?.seconds !== undefined && maxSeconds !== undefined && current.seconds > maxSeconds + 0.5;
  const credits = kind === "video" ? (current?.seconds ? videoCredits(current.seconds, videoTarget) : null) : current ? imageCredits() : null;
  const out = current?.width && current.height ? (kind === "video" ? videoOutput(current.width, current.height, videoTarget) : imageOutput(current.width, current.height, imageTarget)) : null;
  const imageTooBig = kind === "image" && out !== null && out.factor <= 1;
  const canStart = Boolean(current && rights && (credits !== null || fromSource) && !tooLong && !imageTooBig && !busy);
  const targetLabel = kind === "video" ? (videoTarget === "4k" ? "4K" : "1080p") : imageTarget === "4x" ? "4×" : "2×";

  async function start() {
    if (!current) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await startEnhance({ kind, target: kind === "video" ? videoTarget : imageTarget, file: picked?.file, source: fromSource ?? undefined, seconds: current.seconds, width: current.width, height: current.height }, setProgress);
      setPicked(null);
      if (fromSource) router.replace(`/app/enhance?type=${kind}`, { scroll: false });
      setRights(false);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The enhancement could not start. Try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-label="Enhance a file" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
        <div className="flex gap-1 rounded-full bg-surface-muted p-1" role="tablist" aria-label="What to enhance">
          {(["video", "image"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => router.replace(`/app/enhance?type=${k}`, { scroll: false })}
              className={cn("focus-ring flex h-9 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-colors duration-150", kind === k ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}
            >
              {k === "video" ? <Wand2 className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {k === "video" ? "Video" : "Image"}
            </button>
          ))}
        </div>

        {fromSource ? (
          <SourceCard source={fromSource} onClear={() => router.replace(`/app/enhance?type=${kind}`, { scroll: false })} disabled={busy} />
        ) : (
          <FilePicker kind={kind} picked={picked} onPick={(p) => { setPicked(p ? { ...p, kind } : null); setConfirming(false); setError(null); }} onReject={setError} disabled={busy} />
        )}
        {sourceError && !fromSource && <p className="mt-2 text-[12.5px] text-danger">{sourceError}</p>}
        <p className="mt-2 text-[12.5px] text-muted">
          {kind === "video"
            ? `MP4, MOV or WebM, up to ${VIDEO_MAX_MB} MB${limits ? `; up to ${limits.maxSeconds["1080p"]} s at 1080p and ${limits.maxSeconds["4k"]} s at 4K` : ""}.`
            : `JPG, PNG or WebP, up to ${IMAGE_MAX_BYTES / 1024 / 1024} MB. Results stay at or below 24 megapixels.`}
        </p>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink">Size</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {kind === "video"
              ? VIDEO_TARGETS.map((t) => (
                  <OptionCard key={t.key} selected={videoTarget === t.key} onSelect={() => setVideoTarget(t.key)} title={t.label} description={t.text} meta={<span className="text-[12.5px] tabular-nums text-muted">{ENHANCE_CREDITS.videoPerSecond[t.key]} credit{ENHANCE_CREDITS.videoPerSecond[t.key] === 1 ? "" : "s"}/s</span>} disabled={busy} />
                ))
              : IMAGE_TARGETS.map((t) => (
                  <OptionCard key={t.key} selected={imageTarget === t.key} onSelect={() => setImageTarget(t.key)} title={t.label} description={t.text} meta={<span className="text-[12.5px] tabular-nums text-muted">{ENHANCE_CREDITS.image} credits</span>} disabled={busy} />
                ))}
          </div>
          {out && !imageTooBig && <p className="mt-2 text-[12.5px] text-muted">Result: about {out.width.toLocaleString("en-US")} × {out.height.toLocaleString("en-US")} px{"capped" in out && out.capped ? " (kept at 24 megapixels)" : ""}.</p>}
          {kind === "video" && <p className="mt-1 text-[12.5px] text-muted">Videos above 30 frames per second take twice the credits; the exact number is set once the file is read.</p>}
        </fieldset>

        <label className="mt-5 flex items-start gap-3 text-[13.5px] text-ink">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} disabled={busy} className="mt-0.5 size-4 accent-ink" />
          I own this file or have permission to use it.
        </label>

        {tooLong && <p className="mt-4 rounded-panel bg-warning/10 px-3 py-2 text-[13px] text-ink" role="alert">At {targetLabel} a video can be up to {maxSeconds} seconds. This one is {formatDuration(current!.seconds!)}. Pick 1080p or a shorter video.</p>}
        {imageTooBig && <p className="mt-4 rounded-panel bg-warning/10 px-3 py-2 text-[13px] text-ink" role="alert">This image is already 24 megapixels or more; it cannot be made bigger here.</p>}
        {error && <p className="mt-4 rounded-panel bg-danger/10 px-3 py-2 text-[13px] text-danger" role="alert">{error}</p>}

        {!confirming ? (
          <Button type="button" variant="accent" size="lg" className="mt-5 w-full" disabled={!canStart} onClick={() => setConfirming(true)}>
            <Wand2 className="size-4" aria-hidden />
            {credits === null ? "Enhance" : `Enhance · ${credits} credits`}
          </Button>
        ) : (
          <div className="mt-5 rounded-panel border border-border bg-surface-muted p-4" role="group" aria-label="Confirm">
            <p className="text-[14px] text-ink">
              Enhance <span className="font-medium">{current?.name}</span> to {targetLabel} for <span className="font-semibold tabular-nums">{credits === null ? "the credits shown once it is read" : `${credits} credits`}</span>?
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

      <section aria-labelledby="enhanced" className="min-w-0 rounded-card bg-surface shadow-card">
        <h2 id="enhanced" className="px-5 pt-5 text-[17px] font-semibold text-ink sm:px-6">Your enhanced files</h2>
        {loadError && <p className="px-5 pt-3 text-[13px] text-danger sm:px-6">{loadError}</p>}
        {!ready ? (
          <div className="space-y-3 p-5 sm:p-6">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-[14px] bg-tone-enhance-soft text-tone-enhance" aria-hidden><ImageUp className="size-6" /></span>
            <p className="mt-2 text-[15px] font-medium text-ink">Nothing enhanced yet</p>
            <p className="max-w-xs text-[13.5px] text-muted">Add a video or a product photo on the left; the sharper version appears here.</p>
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

/** Whether a job's file is a video or an image (enhancer kinds and media tools alike). */
export function mediaOf(job: EnhanceJobView): EnhanceKind {
  return isMediaToolKey(job.kind) ? MEDIA_TOOLS[job.kind].media : (job.kind as EnhanceKind);
}

/** The second line of a job row: what was done, the sizes and the credits. */
function describeJob(job: EnhanceJobView) {
  const media = mediaOf(job);
  const what = isMediaToolKey(job.kind) ? optionsLabel(job.kind, job.options) || null : job.target === "4k" ? "4K" : job.target === "1080p" ? "1080p" : job.target === "4x" ? "4×" : "2×";
  const size = job.outWidth && job.outHeight && job.width && job.height && (job.outWidth !== job.width || job.outHeight !== job.height) ? `${job.width} × ${job.height} → ${job.outWidth} × ${job.outHeight}` : job.width && job.height ? `${job.width} × ${job.height}` : null;
  return [media === "video" ? (job.seconds ? formatDuration(job.seconds) : "Video") : "Image", what, size, job.credits ? `${job.credits} credits` : null].filter(Boolean).join(" · ");
}

/** The stored file a job starts from (another tool's result or a project's video), with a way back to uploading. */
export function SourceCard({ source, onClear, disabled }: { source: ToolSource; onClear: () => void; disabled?: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-panel border border-border p-3">
      <span className="relative block size-16 shrink-0 overflow-hidden rounded-[10px] bg-surface-muted">
        {source.media === "video" ? <video src={`${source.previewUrl}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden /> : // eslint-disable-next-line @next/next/no-img-element
          <img src={source.previewUrl} alt="" className="size-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{source.fileName}</span>
        <span className="block text-[12.5px] tabular-nums text-muted">{[source.width && source.height ? `${source.width} × ${source.height}` : null, source.seconds ? formatDuration(source.seconds) : null, "from your files"].filter(Boolean).join(" · ")}</span>
      </span>
      <button type="button" onClick={onClear} disabled={disabled} className="focus-ring shrink-0 rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Use another file</button>
    </div>
  );
}

export function FilePicker({ kind, picked, onPick, onReject, disabled }: { kind: EnhanceKind; picked: Picked | null; onPick: (p: Picked | null) => void; onReject: (m: string) => void; disabled?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const types: readonly string[] = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  const maxBytes = kind === "video" ? VIDEO_MAX_MB * 1024 * 1024 : IMAGE_MAX_BYTES;

  function take(file: File | undefined) {
    if (!file) return;
    if (!types.includes(file.type)) return onReject(kind === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPG, PNG or WebP image.");
    if (file.size > maxBytes) return onReject(`This file is ${formatBytes(file.size)}; the limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    const url = URL.createObjectURL(file);
    if (kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => onPick({ file, url, seconds: v.duration, width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => onReject("This video could not be read. Use an MP4, MOV or WebM file.");
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => onPick({ file, url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => onReject("This image could not be read. Use a JPG, PNG or WebP file.");
      img.src = url;
    }
  }

  if (picked) {
    return (
      <div className="mt-4 flex items-center gap-4 rounded-panel border border-border p-3">
        <span className="relative block size-16 shrink-0 overflow-hidden rounded-[10px] bg-surface-muted">
          {kind === "video" ? <video src={`${picked.url}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden /> : // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.url} alt="" className="size-full object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{picked.file.name}</span>
          <span className="block text-[12.5px] tabular-nums text-muted">
            {[picked.width && picked.height ? `${picked.width} × ${picked.height}` : null, picked.seconds ? formatDuration(picked.seconds) : null, formatBytes(picked.file.size)].filter(Boolean).join(" · ")}
          </span>
        </span>
        <button type="button" onClick={() => { URL.revokeObjectURL(picked.url); onPick(null); }} disabled={disabled} aria-label="Remove the file" className="focus-ring grid size-8 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }
  return (
    <label
      htmlFor={id}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-panel border-2 border-dashed px-6 py-10 text-center transition-colors duration-150", over ? "border-tone-enhance bg-tone-enhance-soft" : "border-border hover:border-ink/25 hover:bg-surface-muted/60")}
    >
      <span className="grid size-11 place-items-center rounded-[12px] bg-tone-enhance-soft text-tone-enhance" aria-hidden><Upload className="size-5" /></span>
      <span className="text-[14.5px] font-medium text-ink">{kind === "video" ? "Drop a video or choose a file" : "Drop a product photo or choose a file"}</span>
      <input ref={input} id={id} type="file" accept={types.join(",")} className="sr-only" disabled={disabled} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}

export function JobRow({ job }: { job: EnhanceJobView }) {
  const media = mediaOf(job);
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(false);
  const done = job.status === "completed" && job.resultUrl;
  return (
    <li className="rounded-[14px] border border-border">
      <div className="flex items-center gap-3 p-3">
        <span className="relative block size-14 shrink-0 overflow-hidden rounded-[10px] bg-surface-muted">
          {job.sourceUrl && (media === "video" ? <video src={`${job.resultUrl ?? job.sourceUrl}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden /> : // eslint-disable-next-line @next/next/no-img-element
            <img src={job.resultUrl ?? job.sourceUrl} alt="" className="size-full object-cover" />)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{job.fileName}</span>
          <span className="block truncate text-[12.5px] tabular-nums text-muted">
            {describeJob(job)}
          </span>
          {job.status === "failed" && job.error && <span className="mt-0.5 block text-[12.5px] text-danger">{job.error}</span>}
        </span>
        <StatusBadge status={job.status === "queued" ? "waiting" : job.status} className="shrink-0" />
        {done && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="focus-ring hidden h-9 items-center rounded-full border border-border px-3 text-[13px] font-medium text-ink hover:bg-surface-muted sm:inline-flex">{open ? "Close" : "Compare"}</button>
            <a href={enhanceDownloadHref(job)} download className="focus-ring grid size-9 place-items-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-ink/85" aria-label={`Download ${job.fileName}`} title="Download"><Download className="size-4" aria-hidden /></a>
          </>
        )}
      </div>
      {done && (
        <div className="border-t border-divider px-3 py-2">
          <button type="button" onClick={() => setNext((v) => !v)} aria-expanded={next} className="focus-ring rounded-control text-[12.5px] font-medium text-muted hover:text-ink">{next ? "Hide" : "Use in another tool"}</button>
          {next && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {nextToolsFor(media, `job:${job.id}`, isMediaToolKey(job.kind) ? job.kind : `enhance-${media}`).map((t) => (
                <Link key={t.key} href={t.href} className="focus-ring rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-surface-muted">{t.label}</Link>
              ))}
            </div>
          )}
        </div>
      )}
      {done && open && job.sourceUrl && <Compare kind={media} before={job.sourceUrl} after={job.resultUrl!} transparent={job.kind === "remove-background"} />}
      {job.demo && done && <p className="px-3 pb-3 text-[12px] text-muted">Demo: the result is your original file.</p>}
    </li>
  );
}

/** Before and after: a slider over the image, or the two videos side by side. */
function Compare({ kind, before, after, transparent }: { kind: EnhanceKind; before: string; after: string; /** A cut-out: shown on a checkerboard so the transparent parts are visible. */ transparent?: boolean }) {
  const [at, setAt] = useState(50);
  if (kind === "video") {
    return (
      <div className="grid grid-cols-2 gap-2 border-t border-divider p-3">
        {[["Before", before], ["After", after]].map(([label, src]) => (
          <figure key={label}>
            <video src={src} controls playsInline preload="metadata" className="w-full rounded-[10px] bg-ink" />
            <figcaption className="mt-1 text-center text-[12px] text-muted">{label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <div className="border-t border-divider p-3">
      <div className={cn("relative overflow-hidden rounded-[10px]", transparent ? "checkerboard" : "bg-surface-muted")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="After" className="mx-auto block max-h-[460px] w-full object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Before" className="absolute inset-0 size-full object-contain" style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }} />
        <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${at}%` }} aria-hidden />
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">Before</span>
        <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">After</span>
      </div>
      <input type="range" min={0} max={100} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label="Before and after" className="mt-2 w-full accent-ink" />
    </div>
  );
}
