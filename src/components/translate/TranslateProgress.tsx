"use client";

import { useEffect, useState } from "react";
import { Check, Download, Languages, Loader2, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import { config } from "@/lib/config";
import type { TranslateProject, TranslateStepKey } from "@/lib/types";
import { languageOf } from "@/lib/languages";
import { downloadHref, retryStep } from "@/lib/data/client";
import { getProfile } from "@/lib/data/settingsClient";
import { translateProgress, type LanguageView, type StageView } from "@/lib/translateProgress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { TRANSLATE_STEPS } from "./translateSteps";

/**
 * One progress for a translation (27 Oct 2026): the customer sees one thing being built, not three
 * technical steps. A poster of the source, one bar with a percentage and the minutes left, a short
 * checklist in plain words, a chip per language that becomes a player and a download the moment that
 * version is ready, and the way to start the next video while this one runs. The percentage only
 * ever goes up on screen (a refetch can read slightly lower). The numbers come from
 * src/lib/translateProgress.ts; this file only draws them.
 */
export function TranslateProgress({ project }: { project: TranslateProject }) {
  const now = useNow(project.status === "processing" ? 1000 : 0);
  const p = translateProgress(project, now);
  // The bar never runs backwards on screen (a refetch can read a little lower than the clock did):
  // the highest value seen is kept as state derived during render.
  const [peak, setPeak] = useState(0);
  if (p.percent > peak) setPeak(p.percent);
  const percent = project.status === "processing" ? Math.max(peak, p.percent) : p.percent;
  const failed = project.status === "failed";
  const ready = p.languages.filter((l) => l.state === "ready");
  const [open, setOpen] = useState<string | null>(null);
  const picked = project.translations.find((t) => t.language === (open ?? ready[0]?.code) && t.videoUrl);
  const notify = useNotifyEmail();
  const many = project.targetLanguages.length > 1;
  const title = failed ? "Your translation stopped" : many ? `Your ${project.targetLanguages.length} videos are being made` : `Your ${languageOf(project.targetLanguages[0]).label} video is being made`;

  return (
    <section className="rounded-card bg-surface shadow-card" aria-live="polite" aria-labelledby="progress-title">
      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8">
        <SourcePoster project={project} percent={percent} failed={failed} />
        <div className="min-w-0">
          <h2 id="progress-title" className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">{title}</h2>
          {!failed && (
            <>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink">{percent}<span className="text-[22px] text-muted">%</span></p>
                <p className="text-[14px] text-muted">{p.overdue ? "Taking a little longer than usual" : p.minutesLeft === null ? "" : p.minutesLeft <= 1 ? "Less than a minute left" : `About ${p.minutesLeft} min left`}</p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress">
                <div className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${percent / 100})` }} />
              </div>
              <p className="mt-2 text-[14px] font-medium text-ink">{p.current}{p.current.endsWith("…") ? "" : "…"}</p>
            </>
          )}
          {failed && <FailedPanel project={project} />}

          <ol className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {p.stages.map((s) => <StageRow key={s.key} stage={s} />)}
          </ol>

          {many && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Languages">
              {p.languages.map((l) => <LanguageChip key={l.code} lang={l} open={open === l.code} onOpen={() => setOpen(open === l.code ? null : l.code)} />)}
            </ul>
          )}

          {picked && !failed && (
            <div className="mt-6 flex flex-col gap-4 rounded-panel bg-surface-muted p-4 sm:flex-row sm:items-center">
              <div className="w-[120px] shrink-0"><VideoPlayer src={picked.videoUrl!} simulated={config.demoMode} /></div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{languageOf(picked.language).label} is ready</p>
                <p className="mt-1 text-[13px] text-muted">{many ? "The other languages carry on; you can watch and download this one now." : "Watch it here while the page finishes up."}</p>
                <Button href={downloadHref(project.id, picked.videoUrl!, picked.language)} prefetch={false} variant="primary" size="sm" download className="mt-3">
                  <Download className="size-4" aria-hidden /> Download {languageOf(picked.language).tag}
                </Button>
              </div>
            </div>
          )}

          {!failed && (
            <div className="mt-6 flex flex-col gap-3 border-t border-divider pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-relaxed text-muted">{notify ? "You can close this page. We e-mail you when it is ready." : "You can close this page. The finished video lands in your projects."}</p>
              <Button href="/new/translate" variant="secondary" size="md" className="shrink-0">
                <Plus className="size-4" aria-hidden /> Translate another while you wait
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** The first frame of the source as a 9:16 poster; a soft sheen moves over it while the video is made. */
function SourcePoster({ project, percent, failed }: { project: TranslateProject; percent: number; failed: boolean }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-[120px] overflow-hidden rounded-tile bg-surface-muted shadow-card md:mx-0 md:w-full">
      {project.sourceVideoUrl ? (
        <video src={`${project.sourceVideoUrl}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-muted"><Languages className="size-8" aria-hidden /></span>
      )}
      {!failed && <span className="poster-sheen pointer-events-none absolute inset-0" aria-hidden />}
      <span className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-ink shadow-card">
        <span>{failed ? "Stopped" : `${percent}%`}</span>
        {!failed && <Loader2 className="size-3 animate-spin text-accent motion-reduce:animate-none" aria-hidden />}
      </span>
    </div>
  );
}

function StageRow({ stage }: { stage: StageView }) {
  const done = stage.state === "done";
  const active = stage.state === "active";
  const failed = stage.state === "failed";
  return (
    <li className={cn("flex items-center gap-2.5 text-[14px]", done ? "text-muted" : active ? "text-ink" : failed ? "text-danger" : "text-muted/70")}>
      <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-success text-white" : active ? "bg-accent text-white" : failed ? "bg-danger text-white" : "border border-border")} aria-hidden>
        {done ? <Check className="size-3" /> : active ? <span className="size-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" /> : failed ? <TriangleAlert className="size-3" /> : null}
      </span>
      <span className={cn(active && "font-medium")}>{done ? stage.doneLabel : stage.label}</span>
      <span className="sr-only">{done ? ", done" : active ? ", in progress" : failed ? ", stopped" : ", waiting"}</span>
    </li>
  );
}

function LanguageChip({ lang, open, onOpen }: { lang: LanguageView; open: boolean; onOpen: () => void }) {
  const l = languageOf(lang.code);
  const ready = lang.state === "ready";
  const base = "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150";
  const look = ready ? "border-success/40 bg-success/10 text-ink hover:bg-success/15" : lang.state === "failed" ? "border-danger/40 bg-danger/5 text-ink" : lang.state === "active" ? "border-accent/40 bg-accent-soft text-ink" : "border-border bg-surface text-muted";
  const inner = (
    <>
      <span className="label-mono">{l.tag}</span>
      {ready ? <Check className="size-3.5 text-success" aria-hidden /> : lang.state === "failed" ? <TriangleAlert className="size-3.5 text-danger" aria-hidden /> : <span className="tabular-nums text-muted">{lang.percent}%</span>}
      <span className="sr-only">{l.label}: {lang.label}</span>
    </>
  );
  return (
    <li>
      {ready ? (
        <button type="button" onClick={onOpen} aria-pressed={open} className={cn("focus-ring", base, look, open && "ring-2 ring-success/30")} title={`${l.label}: ready`}>{inner}</button>
      ) : (
        <span className={cn(base, look)} title={`${l.label}: ${lang.label}${lang.error ? ` — ${lang.error}` : ""}`}>{inner}</span>
      )}
    </li>
  );
}

/** One calm message with the plain reason and the retry, instead of three cards. */
function FailedPanel({ project }: { project: TranslateProject }) {
  const key = TRANSLATE_STEPS.find((k) => project.steps[k].status === "failed") as TranslateStepKey | undefined;
  const error = key ? project.steps[key].error : project.translations.find((t) => t.error)?.error;
  return (
    <div className="mt-4 space-y-3 rounded-panel border border-danger/30 bg-danger/5 p-4">
      <p className="text-[14.5px] leading-relaxed text-ink">{error ?? "Something went wrong. Retry; if it keeps failing, contact support."}</p>
      <p className="text-[13px] text-muted">Credits for a stopped video are refunded. Retry uses them again and picks up where it stopped.</p>
      {key && (
        <Button type="button" variant="primary" size="sm" onClick={() => retryStep(project.id, key)}>
          <RotateCcw className="size-4" aria-hidden /> Retry
        </Button>
      )}
    </div>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useNotifyEmail() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    getProfile().then((p) => alive && setOn(p.notifyEmail)).catch(() => alive && setOn(null));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
