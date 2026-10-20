"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Languages, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import type { LanguageCode, TranslationQuality } from "@/lib/types";
import { LANGUAGES, languageOf } from "@/lib/languages";
import { TOP_LANGUAGES } from "@/lib/translateLanguages";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { formatUsd } from "@/lib/translatePricing";
import { estimateTranslateCost } from "@/lib/pricing";
import { Badge } from "@/components/ui/Badge";
import { createTranslateProject } from "@/lib/data/client";
import { useHydrated } from "@/lib/useHydrated";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { VideoDropzone, type UploadedVideo } from "@/components/ui/VideoDropzone";
import { DemoBadge } from "@/components/DemoModeBadge";

type Errors = Partial<Record<"video" | "projectName" | "targets" | "rights" | "form", string>>;

/**
 * Plain-language description of the two modes. Only what the service documents (2026-10-20):
 * Speed = standard lip-sync, "adequate" translation, best for faces with little movement and
 * quick drafts, faster. Precision = the mouth is re-rendered with avatar models for significantly
 * more realistic lip-sync, context- and gender-aware translation, best for faces that move,
 * side angles, partly covered mouths and more than one speaker; slower. Prices are our rate card
 * per minute of source video per language (speed $1.50, precision $3.00).
 */
const QUALITY: Array<{ key: TranslationQuality; title: string; text: string; bestFor: string; wait: string }> = [
  {
    key: "speed",
    title: "Speed",
    text: "Fast and affordable. Standard lip-sync and a straightforward translation.",
    bestFor: "Good for one person talking straight into the camera with little movement, and for quick drafts.",
    wait: "Usually ready within a few minutes.",
  },
  {
    key: "precision",
    title: "Precision",
    text: "The mouth is re-rendered for the new language, so the lip-sync looks noticeably more real. The translation also follows context and the speaker's gender.",
    bestFor: "Better for faces that move, side angles, a partly covered mouth, several speakers, and for final ads.",
    wait: "Takes longer; count on roughly twice the time.",
  },
];
const USD_PER_MINUTE: Record<TranslationQuality, number> = { speed: 1.5, precision: 3 };

/** The "Translate an existing video" form. Demo: simulated project; database: upload + real workflow. */
export function TranslateForm() {
  const router = useRouter();
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [source, setSource] = useState<LanguageCode | "auto">("auto");
  const [targets, setTargets] = useState<LanguageCode[]>([]);
  const [quality, setQuality] = useState<TranslationQuality>("speed");
  const [rights, setRights] = useState(false);
  const [keepTerms, setKeepTerms] = useState("");
  const [format, setFormat] = useState<"original" | "9:16">("9:16");
  const [enhance, setEnhance] = useState(false);
  const [trimSilence, setTrimSilence] = useState(true);
  const [captionPosition, setCaptionPosition] = useState<"low" | "middle">("low");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  /** Second step of the submit: the form is valid and the customer sees the cost once more before anything starts. */
  const [confirming, setConfirming] = useState(false);
  const submitLock = useRef(false);
  // Before React is attached a click would submit the form natively and reload the page with nothing saved.
  const hydrated = useHydrated();

  const seconds = video?.seconds ?? 30;
  const budget = Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) > 0 ? Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) : 1.5;
  const estimateFor = (q: TranslationQuality, enh = enhance) =>
    estimateTranslateCost({ seconds, quality: q, enhance: enh, languages: Math.max(1, targets.length), hasSourceTranscript: source !== "auto" });
  const estimate = estimateFor(quality);
  const overBudget = estimate.perLanguageTotal > budget;
  const tooLong = video?.seconds !== undefined && video.seconds > config.limits.translateVideoMaxSeconds;

  function toggleTarget(code: LanguageCode) {
    if (code === source) {
      setErrors((e) => ({ ...e, targets: `${languageOf(code).label} is the spoken language of the video; pick a different language to translate into.` }));
      return;
    }
    setTargets((t) => (t.includes(code) ? t.filter((c) => c !== code) : [...t, code]));
    if (errors.targets) setErrors((e) => ({ ...e, targets: undefined }));
  }

  // One option per language and regional variant; most-used languages first, then the rest alphabetically.
  const languageOptions: SelectOption[] = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.label,
    group: TOP_LANGUAGES.includes(l.base) ? "Most used" : "All languages",
    disabled: l.code === source,
    disabledReason: "This is the spoken language of the video",
  }));
  const sourceOptions: SelectOption[] = [{ value: "auto", label: "Detect automatically", group: "Recommended" }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label, group: TOP_LANGUAGES.includes(l.base) ? "Most used" : "All languages" }))];

  function validate(): Errors {
    const next: Errors = {};
    if (!video) next.video = "Add the video you want to translate.";
    else if (tooLong) next.video = `Videos up to ${config.limits.translateVideoMaxSeconds / 60} minutes for now.`;
    if (projectName.trim().length < 2) next.projectName = "Give the project a name so you can find it later.";
    if (targets.length === 0) next.targets = "Choose at least one target language.";
    if (!rights) next.rights = "We can only translate videos you own, with the speaker's consent. Tick the box to continue.";
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      setConfirming(false);
      return;
    }
    if (!video) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const { id } = await createTranslateProject({
        name: projectName.trim(),
        video: video.file,
        sourceSeconds: Math.round(video.seconds ?? 30),
        sourceLanguage: source,
        targetLanguages: targets,
        quality,
        keepTerms: keepTerms.split(/[,\n]/).map((t) => t.trim()).filter(Boolean).slice(0, 20),
        format,
        enhance,
        trimSilence,
        captionPosition,
        rightsConfirmed: rights,
      });
      router.push(`/projects/${id}`);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      setConfirming(false);
      setErrors({ form: error instanceof Error ? error.message : "Something went wrong while starting the translation. Please try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <ServiceStatusBanner />
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
          <p className="mt-1 text-[15px] text-muted">Pick one or more target languages. Every translation is checked line by line against the original before it is rendered; nothing waits for you.</p>
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
            <Field id="source" label="Spoken language" hint="Detect automatically works well for one clear speaker. Pick the language only when detection gets it wrong.">
              <SearchableSelect
                id="source"
                value={source}
                options={sourceOptions}
                onChange={(value) => {
                  setSource(value as LanguageCode | "auto");
                  if (value !== "auto") setTargets((t) => t.filter((c) => c !== value));
                }}
                disabled={submitting}
              />
            </Field>
          </div>

          <Field id="targets" label="Translate into" hint="Search and pick one or more languages. Regional variants (e.g. Dutch (Belgium), English (UK)) change the voice's accent and spelling." error={errors.targets}>
            <SearchableSelect id="targets" multiple values={targets} options={languageOptions} onToggle={toggleTarget} placeholder="Search a language…" disabled={submitting} invalid={Boolean(errors.targets)} />
          </Field>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">Quality</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {QUALITY.map((q) => {
                const selected = quality === q.key;
                const est = estimateFor(q.key);
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
                        {q.key === "speed" && <Badge tone="success">Recommended</Badge>}
                      </span>
                      <span className="label-mono text-muted">≈ {formatUsd(est.perLanguageTotal)} / language</span>
                    </span>
                    <span className="text-[13px] leading-relaxed text-ink/90">{q.text}</span>
                    <span className="text-[13px] leading-relaxed text-muted">{q.bestFor}</span>
                    <span className="text-[13px] text-muted">
                      {formatUsd(USD_PER_MINUTE[q.key])} per minute of video per language · {q.wait}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[13px] text-muted">
              Live estimate for {Math.round(seconds)} s of video, {QUALITY.find((q) => q.key === quality)?.title}, {Math.max(1, targets.length)} {targets.length === 1 || targets.length === 0 ? "language" : "languages"}: translation {formatUsd(estimate.perLanguage.proofread + estimate.perLanguage.render)}, quality check {formatUsd(estimate.perLanguage.check)}, captions {formatUsd(estimate.perLanguage.captions)}
              {enhance ? `, enhancement ${formatUsd(estimate.perLanguage.enhance)}` : ""} per language
              {targets.length > 1 ? ` · ${formatUsd(estimate.total)} in total` : ""}.
            </p>
          </fieldset>
        </CardContent>
      </Card>

      {/* 3. Options */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 3 of 4</p>
          <CardTitle className="mt-2 text-xl">Options</CardTitle>
          <p className="mt-1 text-[15px] text-muted">The pictures and the edit stay exactly as they are. Only the language changes.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field id="keepTerms" label="Keep these words untranslated" optional hint="Brand and product names, separated by commas. The translation and the check leave them exactly as written. Max 20.">
            <Input id="keepTerms" value={keepTerms} maxLength={600} onChange={(e) => setKeepTerms(e.target.value)} placeholder="e.g. Senvia, FlexLid" disabled={submitting} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Format</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { key: "9:16", title: "Vertical 9:16 · recommended", text: "For TikTok, Reels and Shorts. The speaker is centred; the sides are cropped." },
                  { key: "original", title: "Keep original", text: "Same width and height as the video you upload. Captions added." },
                ] as const
              ).map((f) => (
                <label key={f.key} className={cn("flex cursor-pointer flex-col gap-1 rounded-[14px] border p-4", format === f.key ? "border-ink bg-surface shadow-card" : "border-border bg-surface-muted", submitting && "pointer-events-none opacity-60")}>
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <input type="radio" name="format" value={f.key} checked={format === f.key} onChange={() => setFormat(f.key)} disabled={submitting} className="size-4 accent-ink" />
                    {f.title}
                  </span>
                  <span className="text-[13px] leading-relaxed text-muted">{f.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="trimSilence" className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-border bg-surface-muted p-4">
            <input id="trimSilence" type="checkbox" checked={trimSilence} onChange={(e) => setTrimSilence(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0 accent-ink" />
            <span>
              <span className="block text-sm font-medium text-ink">Remove silence at start and end</span>
              <span className="block text-[13px] leading-relaxed text-muted">Cuts quiet stretches longer than about 0.3 s before the first and after the last spoken line. The speech itself and the lip-sync are untouched.</span>
            </span>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Caption position</legend>
            <div className="flex gap-1 rounded-full bg-surface-muted p-1 w-fit" role="radiogroup" aria-label="Caption position">
              {(
                [
                  { key: "low", label: "Low" },
                  { key: "middle", label: "Middle" },
                ] as const
              ).map((o) => (
                <button key={o.key} type="button" role="radio" aria-checked={captionPosition === o.key} disabled={submitting} onClick={() => setCaptionPosition(o.key)} className={cn("rounded-full px-3 py-1 text-[13px] font-medium transition-colors", captionPosition === o.key ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-muted">Low keeps the captions above the bottom 15% of the picture, so they do not cover a product shown low in frame. Middle puts them at the centre.</p>
          </fieldset>
          <label htmlFor="enhance" className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-border bg-surface-muted p-4">
            <input id="enhance" type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0 accent-ink" />
            <span>
              <span className="block text-sm font-medium text-ink">Enhance picture quality</span>
              <span className="block text-[13px] leading-relaxed text-muted">Sharper, cleaner picture before the captions go on. Adds about {formatUsd(estimateFor(quality, true).perLanguage.enhance)} per language and a few minutes.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      {/* 4. Rights */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 4 of 4</p>
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

      {/* Estimate before the start */}
      <div className={`flex flex-col gap-2 rounded-[14px] border p-4 sm:flex-row sm:items-center sm:justify-between ${overBudget ? "border-danger/40 bg-danger/5" : "border-border bg-surface-muted"}`}>
        <div>
          <p className="text-sm font-medium text-ink">
            Estimated cost {formatUsd(estimate.perLanguageTotal)} per language · budget {formatUsd(budget)} per language
            {targets.length > 1 ? ` · total for ${targets.length} languages ${formatUsd(estimate.total)}` : ""}
          </p>
          <p className="text-[13px] text-muted">
            {overBudget
              ? "Above the budget per language version. Choose speed, turn off enhancement, or use a shorter video."
              : "Each language version has its own budget. If one version would exceed it, only that version stops; the others finish."}
          </p>
        </div>
        <Badge tone={overBudget ? "danger" : "success"}>{overBudget ? "over budget" : "within budget"}</Badge>
      </div>

      {/* Submit row: the estimate sits on the button, and once more in the confirmation before anything starts */}
      {confirming ? (
        <div className="rounded-[14px] border border-ink bg-surface p-5 shadow-card" role="group" aria-labelledby="confirm-title">
          <p id="confirm-title" className="text-[15px] font-semibold text-ink">Start this translation?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {Math.round(seconds)} s of video · {QUALITY.find((q) => q.key === quality)?.title} · {targets.length} {targets.length === 1 ? "language" : "languages"} ({targets.map((t) => languageOf(t).label).join(", ")}) · {format === "9:16" ? "9:16" : "original size"} with captions.
            {" "}Estimated cost <span className="font-medium text-ink">{formatUsd(estimate.perLanguageTotal)}</span> per language{targets.length > 1 ? <>, <span className="font-medium text-ink">{formatUsd(estimate.total)}</span> in total</> : null}; budget {formatUsd(budget)} per language.
            {config.demoMode ? " Demo mode: nothing is charged, the run is simulated." : " The real amount per language is shown on the project page afterwards."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="accent" size="lg" disabled={submitting || !rights || overBudget}>
              {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
              {submitting ? "Starting…" : `Start now · ${formatUsd(estimate.total)}`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <DemoBadge>Demo mode</DemoBadge>
            <span>
              {config.demoMode
                ? "This starts a simulated run. No video is uploaded or translated yet."
                : "This uploads your video and starts the real translation. Costs are capped by the spending limits."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button href="/new" variant="ghost" aria-disabled={submitting || undefined} className={submitting ? "pointer-events-none opacity-50" : undefined}>
              Back
            </Button>
            <Button type="submit" variant="accent" size="lg" disabled={!hydrated || submitting || !rights || overBudget}>
              {!hydrated ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
              {!hydrated ? "Loading…" : `Start translation · ${formatUsd(estimate.perLanguageTotal)}${targets.length > 1 ? " per language" : ""}`}
            </Button>
          </div>
        </div>
      )}
      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
    </form>
  );
}
