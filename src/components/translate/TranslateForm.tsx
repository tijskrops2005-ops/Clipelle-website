"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Check, Languages, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import type { LanguageCode, TranslateProject, TranslationQuality } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { estimatePerLanguageUsd, estimateTotalUsd, formatUsd } from "@/lib/translatePricing";
import { addProject } from "@/lib/mock/store";
import { emptyTranslations } from "@/lib/mock/translations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, controlClass, controlStateClass } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { VideoDropzone, type UploadedVideo } from "@/components/ui/VideoDropzone";
import { DemoBadge } from "@/components/DemoModeBadge";

type Errors = Partial<Record<"video" | "projectName" | "targets" | "rights" | "form", string>>;

const QUALITY: Array<{ key: TranslationQuality; title: string; text: string }> = [
  { key: "speed", title: "Speed", text: "Standard lip-sync. Ready sooner, about half the price." },
  { key: "precision", title: "Precision", text: "The mouth is redrawn for the new language. Best for close-ups and final ads." },
];

/** The "Translate an existing video" form. Demo mode: adds a simulated project to the store. */
export function TranslateForm() {
  const router = useRouter();
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [source, setSource] = useState<LanguageCode | "auto">("auto");
  const [targets, setTargets] = useState<LanguageCode[]>([]);
  const [quality, setQuality] = useState<TranslationQuality>("speed");
  const [rights, setRights] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const seconds = video?.seconds ?? 30;
  const perLanguage = estimatePerLanguageUsd(seconds, quality);
  const total = estimateTotalUsd(seconds, quality, targets.length);
  const tooLong = video?.seconds !== undefined && video.seconds > config.limits.translateVideoMaxSeconds;

  function toggleTarget(code: LanguageCode) {
    setTargets((t) => (t.includes(code) ? t.filter((c) => c !== code) : [...t, code]));
    if (errors.targets) setErrors((e) => ({ ...e, targets: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!video) next.video = "Add the video you want to translate.";
    else if (tooLong) next.video = `Videos up to ${config.limits.translateVideoMaxSeconds / 60} minutes for now.`;
    if (projectName.trim().length < 2) next.projectName = "Give the project a name so you can find it later.";
    if (targets.length === 0) next.targets = "Choose at least one target language.";
    if (!rights) next.rights = "We can only translate videos you own, with the speaker's consent. Tick the box to continue.";
    return next;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!video) return;

    submitLock.current = true;
    setSubmitting(true);
    const now = new Date().toISOString();
    const project: TranslateProject = {
      id: `prj_${Date.now().toString(36)}`,
      workflow: "translate",
      name: projectName.trim(),
      status: "processing",
      createdAt: now,
      sourceFileName: video.file.name,
      sourceSeconds: Math.round(video.seconds ?? 30),
      // Demo: the browser's object URL only lives in this tab. Stage 8 stores the file.
      sourceVideoUrl: video.previewUrl,
      sourceLanguage: source,
      targetLanguages: targets,
      quality,
      rightsConfirmedAt: now,
      steps: {
        upload: { status: "processing", startedAt: now, attempt: 1 },
        translate: { status: "waiting" },
        review: { status: "waiting" },
        captions: { status: "waiting" },
      },
      translations: emptyTranslations(targets),
    };
    addProject(project);
    router.push(`/projects/${project.id}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {/* 1. The video */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 1 of 3</p>
          <CardTitle className="mt-2 text-xl">Your video</CardTitle>
          <p className="mt-1 text-[15px] text-muted">One speaker, clear audio. The voice and lip movements are matched to the new language.</p>
        </CardHeader>
        <CardContent>
          <Field id="video" label="Video" error={errors.video}>
            <VideoDropzone
              id="video"
              video={video}
              onChange={(v) => {
                setVideo(v);
                if (v && errors.video) setErrors((e) => ({ ...e, video: undefined }));
              }}
              maxSizeMb={config.limits.translateVideoMaxMb}
              maxSeconds={config.limits.translateVideoMaxSeconds}
              onReject={(message) => setErrors((e) => ({ ...e, video: message }))}
              invalid={Boolean(errors.video)}
              disabled={submitting}
            />
          </Field>
        </CardContent>
      </Card>

      {/* 2. Languages and quality */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 2 of 3</p>
          <CardTitle className="mt-2 text-xl">Languages</CardTitle>
          <p className="mt-1 text-[15px] text-muted">Pick one or more target languages. You review every translation before anything is rendered.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Field id="projectName" label="Project name" hint="Only you see this." error={errors.projectName}>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (errors.projectName) setErrors((er) => ({ ...er, projectName: undefined }));
                }}
                placeholder="e.g. Founder story — DE + FR"
                invalid={Boolean(errors.projectName)}
                disabled={submitting}
                autoComplete="off"
              />
            </Field>
            <Field id="source" label="Spoken language in the video" hint="Automatic detection works well for a single speaker.">
              <select
                id="source"
                value={source}
                onChange={(e) => {
                  const value = e.target.value as LanguageCode | "auto";
                  setSource(value);
                  if (value !== "auto") setTargets((t) => t.filter((c) => c !== value));
                }}
                disabled={submitting}
                className={cn(controlClass, controlStateClass(false), "h-11")}
              >
                <option value="auto">Detect automatically</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="targets" label="Translate into" error={errors.targets}>
            <div id="targets" role="group" aria-label="Target languages" className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const selected = targets.includes(l.code);
                const isSource = source === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={selected}
                    disabled={submitting || isSource}
                    onClick={() => toggleTarget(l.code)}
                    title={isSource ? "This is the source language" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      selected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink hover:bg-surface-muted",
                      "disabled:opacity-40",
                    )}
                  >
                    {selected && <Check className="size-4" aria-hidden />}
                    {l.label}
                    <span className={cn("label-mono", selected ? "text-surface/70" : "text-muted")}>{l.tag}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">Quality</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {QUALITY.map((q) => {
                const selected = quality === q.key;
                const est = estimatePerLanguageUsd(seconds, q.key);
                return (
                  <label
                    key={q.key}
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-[14px] border p-4 transition-all",
                      selected ? "border-ink bg-surface shadow-card" : "border-border bg-surface-muted hover:bg-surface",
                      submitting && "pointer-events-none opacity-60",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                        <input
                          type="radio"
                          name="quality"
                          value={q.key}
                          checked={selected}
                          onChange={() => setQuality(q.key)}
                          disabled={submitting}
                          className="size-4 accent-ink"
                        />
                        {q.title}
                      </span>
                      <span className="label-mono text-muted">≈ {formatUsd(est.total)} / language</span>
                    </span>
                    <span className="text-[13px] leading-relaxed text-muted">{q.text}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[13px] text-muted">
              Indication for {Math.round(seconds)} s of video: translation {formatUsd(perLanguage.translation)}, review {formatUsd(perLanguage.proofread)}, captions {formatUsd(perLanguage.captions)} per language.
              {targets.length > 0 ? ` Total for ${targets.length} ${targets.length === 1 ? "language" : "languages"}: ${formatUsd(total)}.` : ""}
            </p>
          </fieldset>
        </CardContent>
      </Card>

      {/* 3. Rights */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 3 of 3</p>
          <CardTitle className="mt-2 text-xl">Rights</CardTitle>
          <p className="mt-1 text-[15px] text-muted">The voice and face in this video are cloned for the translation. We need your confirmation first.</p>
        </CardHeader>
        <CardContent>
          <label
            htmlFor="rights"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors",
              errors.rights ? "border-danger bg-danger/5" : rights ? "border-success/40 bg-success/5" : "border-border bg-surface-muted",
            )}
          >
            <input
              id="rights"
              type="checkbox"
              checked={rights}
              onChange={(e) => {
                setRights(e.target.checked);
                if (e.target.checked && errors.rights) setErrors((er) => ({ ...er, rights: undefined }));
              }}
              disabled={submitting}
              aria-describedby={errors.rights ? "rights-error" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-ink"
            />
            <span className="text-sm leading-relaxed text-ink">{config.rightsConfirmationText}</span>
          </label>
          {errors.rights && (
            <p id="rights-error" role="alert" className="mt-2 text-[13px] text-danger">
              {errors.rights}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <DemoBadge>Demo mode</DemoBadge>
          <span>This starts a simulated run. No video is uploaded or translated yet.</span>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/new" variant="ghost" aria-disabled={submitting || undefined} className={submitting ? "pointer-events-none opacity-50" : undefined}>
            Back
          </Button>
          <Button type="submit" variant="accent" size="lg" disabled={submitting || !rights}>
            {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
            {submitting ? "Starting…" : "Start translation"}
          </Button>
        </div>
      </div>
      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
    </form>
  );
}
