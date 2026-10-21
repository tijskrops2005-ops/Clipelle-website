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
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { VideoDropzone, formatDuration, type UploadedVideo } from "@/components/ui/VideoDropzone";
import { buildTranslateDraft, validateTranslateForm, type TranslateFormErrors } from "@/lib/forms/translateDraft";
import { SectionCard } from "@/components/ui/SectionCard";
import { OptionCard, OptionGrid } from "@/components/ui/OptionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Disclosure } from "@/components/ui/Disclosure";
import { SummaryPanel } from "@/components/ui/SummaryPanel";

type Errors = TranslateFormErrors;

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

/**
 * The "Translate an existing video" form: three numbered blocks (video, languages and quality,
 * captions and format) and a fixed summary that holds the rights confirmation and the button.
 * Demo: simulated project; database: upload + real workflow. What it sends is built by
 * buildTranslateDraft and covered by src/lib/forms/forms.test.ts.
 */
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

  const formState = { video: video ?? undefined, projectName, source, targets, quality, rights, keepTerms, format, enhance, trimSilence, captionPosition };

  function validate(): Errors {
    return validateTranslateForm(formState);
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
      const { id } = await createTranslateProject(buildTranslateDraft({ ...formState, video }));
      router.push(`/projects/${id}`);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      setConfirming(false);
      setErrors({ form: error instanceof Error ? error.message : "Something went wrong while starting the translation. Please try again." });
    }
  }

  const qualityTitle = QUALITY.find((q) => q.key === quality)?.title ?? "Speed";
  const summaryRows = [
    { label: "Video", value: video ? formatDuration(Math.round(video.seconds ?? 30)) : "Not added yet", muted: !video },
    { label: "From", value: source === "auto" ? "Detected automatically" : languageOf(source).label },
    { label: "Into", value: targets.length === 0 ? "Pick a language" : targets.map((t) => languageOf(t).tag).join(", "), muted: targets.length === 0 },
    { label: "Quality", value: qualityTitle },
    { label: "Format", value: format === "9:16" ? "9:16 · captions" : "Original · captions" },
    ...(enhance ? [{ label: "Enhancement", value: "On" }] : []),
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="min-w-0 space-y-6">
        <ServiceStatusBanner />

        {/* 1. The video */}
        <SectionCard number={1} title="Your video" description="One speaker, clear audio. The voice and lip movements are matched to the new language; the pictures and the edit stay as they are.">
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
        </SectionCard>

        {/* 2. Languages and quality */}
        <SectionCard number={2} title="Languages and quality" description="Pick one or more target languages. Every translation is checked line by line against the original before it is rendered; nothing waits for you.">
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

          <Field id="targets" label="Translate into" hint="Search and pick one or more languages. Regional variants (e.g. Dutch (Belgium), English (UK)) change the voice's accent and spelling." error={errors.targets}>
            <SearchableSelect id="targets" multiple values={targets} options={languageOptions} onToggle={toggleTarget} placeholder="Search a language…" disabled={submitting} invalid={Boolean(errors.targets)} />
          </Field>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">Quality</legend>
            <OptionGrid columns={2}>
              {QUALITY.map((q) => {
                const est = estimateFor(q.key);
                return (
                  <OptionCard
                    key={q.key}
                    selected={quality === q.key}
                    onSelect={() => setQuality(q.key)}
                    disabled={submitting}
                    title={q.title}
                    badge={q.key === "speed" ? <Badge tone="success">Recommended</Badge> : undefined}
                    meta={<span className="label-mono text-muted">≈ {formatUsd(est.perLanguageTotal)} / language</span>}
                    description={
                      <>
                        <span className="block text-ink/90">{q.text}</span>
                        <span className="mt-1 block">{q.bestFor}</span>
                      </>
                    }
                    footnote={`${formatUsd(USD_PER_MINUTE[q.key])} per minute of video per language · ${q.wait}`}
                  />
                );
              })}
            </OptionGrid>
            <p className="text-[13px] text-muted">
              Live estimate for {Math.round(seconds)} s of video, {qualityTitle}, {Math.max(1, targets.length)} {targets.length === 1 || targets.length === 0 ? "language" : "languages"}: translation {formatUsd(estimate.perLanguage.proofread + estimate.perLanguage.render)}, quality check {formatUsd(estimate.perLanguage.check)}, captions {formatUsd(estimate.perLanguage.captions)}
              {enhance ? `, enhancement ${formatUsd(estimate.perLanguage.enhance)}` : ""} per language
              {targets.length > 1 ? ` · ${formatUsd(estimate.total)} in total` : ""}.
            </p>
          </fieldset>

          <Disclosure title="Advanced" summary={keepTerms.trim() ? "Words kept untranslated" : "Brand and product names to keep untranslated"}>
            <Field id="keepTerms" label="Keep these words untranslated" optional hint="Brand and product names, separated by commas. The translation and the check leave them exactly as written. Max 20.">
              <Input id="keepTerms" value={keepTerms} maxLength={600} onChange={(e) => setKeepTerms(e.target.value)} placeholder="e.g. Senvia, FlexLid" disabled={submitting} />
            </Field>
          </Disclosure>
        </SectionCard>

        {/* 3. Captions and format */}
        <SectionCard number={3} title="Captions and format" description="Captions of what is said are the only thing added to the picture. Choose the frame they go in.">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Format</legend>
            <OptionGrid columns={2}>
              {(
                [
                  { key: "9:16", title: "Vertical 9:16", text: "For TikTok, Reels and Shorts. The speaker is centred; the sides are cropped.", recommended: true },
                  { key: "original", title: "Keep original", text: "Same width and height as the video you upload. Captions added.", recommended: false },
                ] as const
              ).map((f) => (
                <OptionCard
                  key={f.key}
                  selected={format === f.key}
                  onSelect={() => setFormat(f.key)}
                  disabled={submitting}
                  title={f.title}
                  badge={f.recommended ? <Badge tone="success">Recommended</Badge> : undefined}
                  description={f.text}
                />
              ))}
            </OptionGrid>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Caption position</legend>
            <SegmentedControl
              label="Caption position"
              size="sm"
              options={[
                { key: "low", label: "Low" },
                { key: "middle", label: "Middle" },
              ]}
              value={captionPosition}
              onChange={setCaptionPosition}
              disabled={submitting}
            />
            <p className="text-[13px] text-muted">Low keeps the captions above the bottom 15% of the picture, so they do not cover a product shown low in frame. Middle puts them at the centre.</p>
          </fieldset>

          <Disclosure title="Advanced" summary={`${trimSilence ? "Silence removed" : "Silence kept"} · ${enhance ? "enhancement on" : "no enhancement"}`}>
            <label htmlFor="trimSilence" className={cn("flex cursor-pointer items-start gap-3 rounded-panel border p-4 transition-colors duration-150", trimSilence ? "border-ink bg-surface" : "border-border bg-surface-muted/60 hover:bg-surface")}>
              <input id="trimSilence" type="checkbox" checked={trimSilence} onChange={(e) => setTrimSilence(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-ink">Remove silence at start and end</span>
                <span className="block text-[13px] leading-relaxed text-muted">Cuts quiet stretches longer than about 0.3 s before the first and after the last spoken line. The speech itself and the lip-sync are untouched.</span>
              </span>
            </label>
            <label htmlFor="enhance" className={cn("flex cursor-pointer items-start gap-3 rounded-panel border p-4 transition-colors duration-150", enhance ? "border-ink bg-surface" : "border-border bg-surface-muted/60 hover:bg-surface")}>
              <input id="enhance" type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium text-ink">Enhance picture quality</span>
                <span className="block text-[13px] leading-relaxed text-muted">Sharper, cleaner picture before the captions go on. Adds about {formatUsd(estimateFor(quality, true).perLanguage.enhance)} per language and a few minutes.</span>
              </span>
            </label>
          </Disclosure>
        </SectionCard>
      </div>

      {/* The fixed summary: choices, cost per language, the rights confirmation and the button */}
      <SummaryPanel
        rows={summaryRows}
        total={{ label: targets.length > 1 ? `Per language · ${formatUsd(estimate.total)} in total` : "Estimated cost per language", value: formatUsd(estimate.perLanguageTotal), tone: overBudget ? "danger" : "neutral" }}
        footnote={
          config.demoMode
            ? "Demo mode: this starts a simulated run. No video is uploaded or translated yet."
            : `Budget ${formatUsd(budget)} per language version. If one version would exceed it, only that version stops; the others finish. The real amount per language is shown on the project page afterwards.`
        }
      >
        {overBudget && (
          <p role="status" className="rounded-chip bg-danger/10 p-3 text-[13px] font-medium leading-relaxed text-danger">
            Above the budget of {formatUsd(budget)} per language version. Choose Speed, turn off enhancement, or use a shorter video.
          </p>
        )}
        <label
          htmlFor="rights"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-panel border p-3.5 transition-colors duration-150",
            errors.rights ? "border-danger bg-danger/5" : rights ? "border-success/40 bg-success/5" : "border-border bg-surface-muted/60 hover:bg-surface",
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
            aria-describedby={errors.rights ? "rights-error" : "rights-note"}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="text-[13px] leading-relaxed text-ink">{config.rightsConfirmationText}</span>
        </label>
        {errors.rights ? (
          <p id="rights-error" role="alert" className="text-[13px] text-danger">
            {errors.rights}
          </p>
        ) : (
          <p id="rights-note" className="text-[13px] text-muted">The voice and face in this video are cloned for the translation, so we need your confirmation first.</p>
        )}
        {confirming ? (
          <div className="fold-in rounded-panel border border-ink bg-surface p-4" role="group" aria-labelledby="confirm-title">
            <p id="confirm-title" className="text-[15px] font-semibold text-ink">Start this translation?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {Math.round(seconds)} s of video · {qualityTitle} · {targets.length} {targets.length === 1 ? "language" : "languages"} ({targets.map((t) => languageOf(t).label).join(", ")}) · {format === "9:16" ? "9:16" : "original size"} with captions.
              {" "}Estimated cost <span className="font-medium text-ink">{formatUsd(estimate.perLanguageTotal)}</span> per language{targets.length > 1 ? <>, <span className="font-medium text-ink">{formatUsd(estimate.total)}</span> in total</> : null}; budget {formatUsd(budget)} per language.
              {config.demoMode ? " Demo mode: nothing is charged, the run is simulated." : " The real amount per language is shown on the project page afterwards."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting || !rights || overBudget}>
                {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
                {submitting ? "Starting…" : `Start now · ${formatUsd(estimate.total)}`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={!hydrated || submitting || !rights || overBudget}>
              {!hydrated ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Languages className="size-5" aria-hidden />}
              {!hydrated ? "Loading…" : `Start translation · ${formatUsd(estimate.perLanguageTotal)}${targets.length > 1 ? " per language" : ""}`}
            </Button>
            <Button href="/new" variant="ghost" className={cn("w-full", submitting && "pointer-events-none opacity-50")} aria-disabled={submitting || undefined}>
              Back
            </Button>
          </>
        )}
        {errors.form && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.form}
          </p>
        )}
      </SummaryPanel>
    </form>
  );
}
