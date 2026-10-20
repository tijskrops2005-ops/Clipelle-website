"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { config } from "@/lib/config";
import { createAdProject } from "@/lib/data/client";
import { useHydrated } from "@/lib/useHydrated";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { PresenterPicker } from "@/components/PresenterPicker";
import { AD_LENGTHS, DEFAULTS, DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE, PRESENTER_QUALITIES, estimateAdCost, formatUsd, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Presenter } from "@/lib/types";
import { VoicePicker } from "@/components/VoicePicker";
import { AD_LANGUAGES, AD_LANGUAGE_CODES, DEFAULT_SPEED, SPEEDS, isAdLanguage, type AdLanguageCode, type SpeedKey, type VoiceOptions } from "@/lib/voiceOptions";
import {
  AD_TONES,
  BACKGROUND_COLORS,
  BRAND_COLORS,
  CAPTION_STYLES,
  CAPTION_STYLE_META,
  DEFAULT_ACCENT,
  DEFAULT_AD_LANGUAGE,
  DEFAULT_CAPTION_STYLE,
  DEFAULT_FONT,
  DEFAULT_TONE,
  DIRECTION_MAX_CHARS,
  FONT_KEYS,
  FONT_META,
  HEX_COLOR,
  MIN_LARGE_TEXT_CONTRAST,
  OFFER_MAX_CHARS,
  TONE_META,
  contrastRatio,
  type AdTone,
  type CaptionStyle,
  type FontKey,
} from "@/lib/adOptions";
import { controlClass, controlStateClass } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { UploadDropzone, type UploadedImage } from "@/components/ui/UploadDropzone";

type Values = {
  projectName: string;
  productName: string;
  productUrl: string;
  description: string;
  script: string;
  offer: string;
  direction: string;
};

type Errors = Partial<Record<keyof Values | "images" | "form", string>>;

const MIN_DESCRIPTION = 20;

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: Values, images: UploadedImage[]): Errors {
  const errors: Errors = {};
  if (values.projectName.trim().length < 2) {
    errors.projectName = "Give the project a name so you can find it later.";
  }
  if (!values.productName.trim()) {
    errors.productName = "Enter the product name.";
  }
  if (values.productUrl.trim() && !isValidHttpUrl(values.productUrl.trim())) {
    errors.productUrl = "Enter a full link that starts with http:// or https://.";
  }
  if (values.description.trim().length < MIN_DESCRIPTION) {
    errors.description = `Describe the product in at least ${MIN_DESCRIPTION} characters.`;
  }
  if (images.length === 0) {
    errors.images = "Add at least one product image.";
  }
  return errors;
}

/**
 * The "New ad" form. Validates on submit, disables the button while submitting
 * (rule 4: no duplicate workflow starts) and creates the project through the data layer
 * (demo: simulated in the browser; database: uploads + the real workflow).
 */
export function ProjectForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    projectName: "",
    productName: "",
    productUrl: "",
    description: "",
    script: "",
    offer: "",
    direction: "",
  });
  const [language, setLanguage] = useState<AdLanguageCode>(isAdLanguage(DEFAULT_AD_LANGUAGE) ? DEFAULT_AD_LANGUAGE : "en");
  const [voiceAccent, setVoiceAccent] = useState<string | undefined>(undefined);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [speed, setSpeed] = useState<SpeedKey>(DEFAULT_SPEED);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOptions | null>(null);
  /** The presenter in effect (picked or default): its gender filters the voices, its own voice is the default. */
  const [presenter, setPresenter] = useState<Presenter | undefined>(undefined);
  const [tone, setTone] = useState<AdTone>(DEFAULT_TONE);
  const [seconds, setSeconds] = useState<AdLength>(DEFAULT_AD_SECONDS);
  const [engine, setEngine] = useState<PresenterEngine>(DEFAULT_PRESENTER_ENGINE);
  const [lookId, setLookId] = useState<string | undefined>(undefined);
  /** Presenter background: undefined = the presenter's own; a colour key; or "image" with one uploaded file. */
  const [backgroundChoice, setBackgroundChoice] = useState<"own" | "image" | string>("own");
  const [backgroundImages, setBackgroundImages] = useState<UploadedImage[]>([]);
  /** Brand style for the final edit; everything optional with app defaults. */
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [customAccent, setCustomAccent] = useState("");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [font, setFont] = useState<FontKey>(DEFAULT_FONT);
  const [logoImages, setLogoImages] = useState<UploadedImage[]>([]);
  const [reviewScript, setReviewScript] = useState(false);
  const effectiveAccent = HEX_COLOR.test(customAccent) ? customAccent.toUpperCase() : accent;
  // White text sits on the accent (hook sticker, CTA pill, active caption word): warn below 3:1.
  const accentContrast = contrastRatio(effectiveAccent, "#FFFFFF");
  const lowContrast = accentContrast < MIN_LARGE_TEXT_CONTRAST;
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  /** Second step of the submit: the form is valid and the customer sees the cost once more before anything starts. */
  const [confirming, setConfirming] = useState(false);
  const submitLock = useRef(false);
  // Before React is attached a click would submit the form natively and reload the page with nothing saved.
  const hydrated = useHydrated();
  const budget = Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) > 0 ? Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) : 1.5;
  // Estimate per combination of length and presenter quality; the budget applies to the combination.
  const estimateFor = (len: AdLength, eng: PresenterEngine = engine) => estimateAdCost({ seconds: len, clipModel: DEFAULTS.clipModel, engine: eng, speed: SPEEDS.find((s) => s.key === speed)?.value ?? 1 });
  const estimate = estimateFor(seconds);
  const overBudget = estimate.total > budget;
  const lengthsWithinBudget = AD_LENGTHS.filter((len) => estimateFor(len).total <= budget);
  const qualityLabel = PRESENTER_QUALITIES.find((q) => q.key === engine)?.label ?? "Premium";

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return; // guard against double clicks / Enter + click

    const nextErrors = validate(values, images);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setConfirming(false);
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);

    try {
      const { id } = await createAdProject({
        name: values.projectName.trim(),
        seconds,
        engine,
        lookId,
        background:
          backgroundChoice === "image" && backgroundImages[0]
            ? { type: "image", file: backgroundImages[0].file }
            : backgroundChoice !== "own" && backgroundChoice !== "image"
              ? { type: "color", value: BACKGROUND_COLORS.find((c) => c.key === backgroundChoice)?.value ?? "#FFFFFF" }
              : undefined,
        brand: {
          accent: effectiveAccent !== DEFAULT_ACCENT ? effectiveAccent : undefined,
          captionStyle: captionStyle !== DEFAULT_CAPTION_STYLE ? captionStyle : undefined,
          font: font !== DEFAULT_FONT ? font : undefined,
          logo: logoImages[0]?.file,
        },
        reviewScript,
        language,
        accent: voiceAccent,
        voiceId,
        speed,
        offer: values.offer.trim() || undefined,
        direction: values.direction.trim() || undefined,
        tone,
        productName: values.productName.trim(),
        productUrl: values.productUrl.trim() || undefined,
        description: values.description.trim(),
        script: values.script.trim() || undefined,
        images: images.map((img) => img.file),
      });
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      router.push(`/projects/${id}`);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      setConfirming(false);
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Something went wrong while preparing your images. Please try again.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <ServiceStatusBanner />
      {/* 1. The main input first: product images + the product itself */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 1 of 3</p>
          <CardTitle className="mt-2 text-xl">Your product</CardTitle>
          <p className="mt-1 text-[15px] text-muted">
            Clear photos are the single biggest factor in a good product clip.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field id="images" label="Product images" hint="Every ad is vertical 9:16, the format for TikTok, Reels and Shorts. Portrait or square photos work best." error={errors.images}>
            <UploadDropzone
              id="images"
              images={images}
              onChange={(next) => {
                setImages(next);
                if (errors.images && next.length) setErrors((e) => ({ ...e, images: undefined }));
              }}
              onReject={(message) => setErrors((e) => ({ ...e, images: message }))}
              invalid={Boolean(errors.images)}
              disabled={submitting}
            />
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field id="productName" label="Product name" error={errors.productName}>
              <Input
                id="productName"
                value={values.productName}
                onChange={(e) => update("productName", e.target.value)}
                placeholder="e.g. Glow Vitamin C Serum"
                invalid={Boolean(errors.productName)}
                disabled={submitting}
                autoComplete="off"
              />
            </Field>
            <Field
              id="productUrl"
              label="Product URL"
              optional
              hint="We use it for context only. Nothing is scraped yet."
              error={errors.productUrl}
            >
              <Input
                id="productUrl"
                type="url"
                inputMode="url"
                value={values.productUrl}
                onChange={(e) => update("productUrl", e.target.value)}
                placeholder="https://yourstore.com/products/..."
                invalid={Boolean(errors.productUrl)}
                disabled={submitting}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* 2. The presenter: quality and look. Nothing picked = the default look. */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 2 of 3</p>
          <CardTitle className="mt-2 text-xl">Your presenter</CardTitle>
          <p className="mt-1 text-[15px] text-muted">Who presents the product, and in which quality. The default works well for most products.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Presenter quality</legend>
            <p className="mb-3 text-[13px] text-muted">How the presenter looks and moves. The price is for the whole video at the chosen length.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRESENTER_QUALITIES.map((q) => {
                const est = estimateFor(seconds, q.key);
                const over = est.total > budget;
                const selected = engine === q.key;
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => setEngine(q.key)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-[14px] border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      selected ? "border-ink bg-surface-muted" : "border-border bg-surface hover:shadow-card",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                        {q.label}
                        {q.key === DEFAULT_PRESENTER_ENGINE && <Badge tone="success">Recommended</Badge>}
                      </span>
                      <Badge tone={over ? "danger" : "neutral"}>{over ? `${formatUsd(est.total)} · over budget` : `about ${formatUsd(est.total)}`}</Badge>
                    </span>
                    <span className="mt-1 block text-[13px] text-muted">{q.blurb}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Presenter</p>
            <PresenterPicker
              engine={engine}
              value={lookId}
              onChange={(id, p) => {
                setLookId(id);
                if (p) setPresenter(p);
              }}
              disabled={submitting}
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="language" label="Language" hint="One language for the script, the captions and the voice.">
                <select
                  id="language"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as AdLanguageCode);
                    setVoiceAccent(undefined);
                    setVoiceId(undefined);
                  }}
                  disabled={submitting}
                  className={cn(controlClass, controlStateClass(false), "h-11")}
                >
                  {(voiceOptions?.languages.length ? voiceOptions.languages.map((l) => l.code) : AD_LANGUAGE_CODES).map((code) => (
                    <option key={code} value={code}>{AD_LANGUAGES[code].label}</option>
                  ))}
                </select>
              </Field>
              <Field id="accent" label="Accent" hint={voiceOptions && voiceOptions.accents.length === 0 ? "No regional variants for this language yet." : "Only variants that have voices are listed."}>
                <select
                  id="accent"
                  value={voiceAccent ?? ""}
                  onChange={(e) => {
                    setVoiceAccent(e.target.value || undefined);
                    setVoiceId(undefined);
                  }}
                  disabled={submitting || !voiceOptions || voiceOptions.accents.length === 0}
                  className={cn(controlClass, controlStateClass(false), "h-11")}
                >
                  <option value="">Any</option>
                  {voiceOptions?.accents.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Voice</p>
              <VoicePicker
                language={language}
                accent={voiceAccent}
                gender={presenter?.gender === "female" || presenter?.gender === "male" ? presenter.gender : undefined}
                lookVoiceId={presenter?.defaultVoiceId}
                value={voiceId}
                onChange={setVoiceId}
                onOptions={setVoiceOptions}
                disabled={submitting}
              />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Speaking speed</legend>
              <div className="flex gap-1 rounded-full bg-surface-muted p-1 w-fit" role="radiogroup" aria-label="Speaking speed">
                {SPEEDS.map((sp) => (
                  <button
                    key={sp.key}
                    type="button"
                    role="radio"
                    aria-checked={speed === sp.key}
                    disabled={submitting}
                    onClick={() => setSpeed(sp.key)}
                    className={cn("rounded-full px-3 py-1 text-[13px] font-medium transition-colors", speed === sp.key ? "bg-ink text-white" : "text-muted hover:text-ink")}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[13px] text-muted">The word limit stays the same; a slower voice makes the video about 10% longer and a faster one about 10% shorter. The estimate follows.</p>
            </fieldset>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Background</p>
            <p className="mb-3 text-[13px] text-muted">A solid colour or your own image behind the presenter. Not every presenter can swap their background; then the original is kept and the project page says so.</p>
            <div className="flex flex-wrap gap-2">
              {[{ key: "own", label: "Presenter's own", value: "" }, ...BACKGROUND_COLORS, { key: "image", label: "Your own image", value: "" }].map((c) => {
                const selected = backgroundChoice === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setBackgroundChoice(c.key)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      selected ? "border-ink bg-surface-muted text-ink" : "border-border bg-surface text-muted hover:text-ink",
                    )}
                  >
                    {c.value ? <span className="size-4 rounded-full border border-border" style={{ backgroundColor: c.value }} aria-hidden /> : null}
                    {c.label}
                  </button>
                );
              })}
            </div>
            {backgroundChoice === "image" && (
              <div className="mt-3">
                <UploadDropzone id="backgroundImage" images={backgroundImages} onChange={setBackgroundImages} max={1} disabled={submitting} title="Drop a background image here, or click to choose" hint="PNG or JPG, up to 10 MB. Portrait or square works best." onReject={(message) => setErrors((e) => ({ ...e, form: message }))} />
                <p className="mt-1.5 text-[13px] text-muted">A calm, plain picture works best: the hook text and captions sit on top of it.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Details that shape the script and the final edit */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 3 of 3</p>
          <CardTitle className="mt-2 text-xl">Details</CardTitle>
          <p className="mt-1 text-[15px] text-muted">
            What should the video say? Keep it short and concrete.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field id="projectName" label="Project name" hint="Only you see this." error={errors.projectName}>
            <Input
              id="projectName"
              value={values.projectName}
              onChange={(e) => update("projectName", e.target.value)}
              placeholder="e.g. Glow Serum — Launch ad"
              invalid={Boolean(errors.projectName)}
              disabled={submitting}
              autoComplete="off"
            />
          </Field>

          <Field
            id="description"
            label="Product description"
            hint="Two or three sentences: what it is, who it is for, why it is better."
            error={errors.description}
          >
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="A lightweight vitamin C serum that brightens dull skin in 14 days. Vegan and fragrance-free."
              invalid={Boolean(errors.description)}
              disabled={submitting}
            />
          </Field>

          <Field id="seconds" label="Video length" hint={`Recommended: ${DEFAULT_AD_SECONDS} s. The presenter talks the whole video; the estimate follows your choice.`}>
            <select
              id="seconds"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value) as AdLength)}
              disabled={submitting}
              className={`${controlClass} ${controlStateClass(false)} h-11`}
            >
              {AD_LENGTHS.map((len) => (
                <option key={len} value={len}>
                  {len} seconds · about {formatUsd(estimateFor(len).total)}{len === DEFAULT_AD_SECONDS ? " · recommended" : ""}{estimateFor(len).total > budget ? " · over budget" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field id="offer" label="Offer" optional hint={`Used in the call to action. Leave empty and no offer is mentioned. Max ${OFFER_MAX_CHARS} characters.`}>
            <Input id="offer" value={values.offer} maxLength={OFFER_MAX_CHARS} onChange={(e) => update("offer", e.target.value)} placeholder="e.g. 20% off this week" disabled={submitting} />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Tone</legend>
            <div className="grid gap-3 sm:grid-cols-4">
              {AD_TONES.map((t) => {
                const selected = tone === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-[14px] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      selected ? "border-ink bg-surface-muted" : "border-border bg-surface hover:shadow-card",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{TONE_META[t].label}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{TONE_META[t].blurb}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field id="direction" label="Direction" optional hint={`Who it is for and what to emphasise. Max ${DIRECTION_MAX_CHARS} characters.`}>
            <Input id="direction" value={values.direction} maxLength={DIRECTION_MAX_CHARS} onChange={(e) => update("direction", e.target.value)} placeholder="e.g. for mums, light-hearted, no exaggerated claims" disabled={submitting} />
          </Field>

          <fieldset className="rounded-[14px] bg-surface-muted p-4">
            <legend className="px-1 text-sm font-medium text-ink">Brand style</legend>
            <p className="mb-4 mt-1 text-[13px] text-muted">All optional. Your colour goes on the hook, the call-to-action button and the spoken caption word; the logo sits top right.</p>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">Accent colour</p>
                <div className="flex flex-wrap items-center gap-2">
                  {BRAND_COLORS.map((c) => {
                    const selected = !HEX_COLOR.test(customAccent) && accent === c.value;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setAccent(c.value);
                          setCustomAccent("");
                        }}
                        disabled={submitting}
                        aria-pressed={selected}
                        title={c.label}
                        className={cn("grid size-8 place-items-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40", selected ? "border-ink" : "border-transparent")}
                      >
                        <span className="size-6 rounded-full border border-border" style={{ backgroundColor: c.value }} aria-hidden />
                        <span className="sr-only">{c.label}</span>
                      </button>
                    );
                  })}
                  <Input id="customAccent" value={customAccent} onChange={(e) => setCustomAccent(e.target.value.trim())} placeholder="#1F3A5F" maxLength={7} disabled={submitting} className="h-9 w-28 text-[13px]" aria-label="Custom accent colour (hex)" />
                </div>
                {lowContrast && (
                  <p role="status" className="mt-2 text-[13px] font-medium text-danger">
                    This colour is too light: white text on it is hard to read (contrast {accentContrast.toFixed(1)}:1, we recommend at least {MIN_LARGE_TEXT_CONTRAST}:1). Pick a darker colour.
                  </p>
                )}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="captionStyle" label="Captions" hint={CAPTION_STYLE_META[captionStyle].blurb}>
                  <select id="captionStyle" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value as CaptionStyle)} disabled={submitting} className={cn(controlClass, controlStateClass(false), "h-11")}>
                    {CAPTION_STYLES.map((k) => (
                      <option key={k} value={k}>{CAPTION_STYLE_META[k].label}</option>
                    ))}
                  </select>
                </Field>
                <Field id="font" label="Font" hint={FONT_META[font].blurb}>
                  <select id="font" value={font} onChange={(e) => setFont(e.target.value as FontKey)} disabled={submitting} className={cn(controlClass, controlStateClass(false), "h-11")}>
                    {FONT_KEYS.map((k) => (
                      <option key={k} value={k}>{FONT_META[k].label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field id="logo" label="Logo" optional hint="PNG with a transparent background works best. Shown small, top right, for the whole video.">
                <UploadDropzone id="logo" images={logoImages} onChange={setLogoImages} max={1} disabled={submitting} title="Drop your logo here, or click to choose" hint="PNG or JPG, up to 10 MB, one file." onReject={(message) => setErrors((e) => ({ ...e, form: message }))} />
              </Field>
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-[14px] border border-border p-4 text-sm text-ink">
            <input type="checkbox" checked={reviewScript} onChange={(e) => setReviewScript(e.target.checked)} disabled={submitting} className="mt-0.5 size-4 accent-ink" />
            <span>
              <span className="font-medium">Review script first</span>
              <span className="block text-[13px] text-muted">The video pauses after the script. You pick one of three hooks, adjust the text, and approve before the presenter and product clip are made. Off: the video is made in one go.</span>
            </span>
          </label>

          <Field
            id="script"
            label="Script"
            optional
            hint="What the presenter says. Leave empty and we write a short script from your description."
            error={errors.script}
          >
            <Textarea
              id="script"
              value={values.script}
              onChange={(e) => update("script", e.target.value)}
              placeholder="Tired of dull skin? Meet Glow, the serum that brightens in two weeks."
              disabled={submitting}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Estimate before the start */}
      <div className={`flex flex-col gap-2 rounded-[14px] border p-4 sm:flex-row sm:items-center sm:justify-between ${overBudget ? "border-danger/40 bg-danger/5" : "border-border bg-surface-muted"}`}>
        <div>
          <p className="text-sm font-medium text-ink">
            Estimated cost {formatUsd(estimate.total)} · budget {formatUsd(budget)} per video
          </p>
          <p className="text-[13px] text-muted">
            Script {formatUsd(estimate.parts.script)} · product clip {formatUsd(estimate.parts.clip)} (+{formatUsd(estimate.parts.expand)} if the photo needs expanding) · {qualityLabel} presenter {seconds} s {formatUsd(estimate.parts.presenter)} · captions and edit {formatUsd(estimate.parts.captions)}.
          </p>
          {overBudget && (
            <p className="mt-1.5 text-[13px] font-medium text-danger">
              A {seconds}-second video with the {qualityLabel} presenter is above the budget, so it cannot start.{" "}
              {lengthsWithinBudget.length > 0 ? `With ${qualityLabel}, choose ${lengthsWithinBudget.join(" or ")} seconds` : `No length fits the budget with ${qualityLabel}`}
              {engine === "avatar_iv" ? ", or switch to Standard." : "."}
            </p>
          )}
        </div>
        <Badge tone={overBudget ? "danger" : "success"}>{overBudget ? "over budget" : "within budget"}</Badge>
      </div>

      {/* Submit row: the estimate sits on the button, and once more in the confirmation before anything starts */}
      {confirming ? (
        <div className="rounded-[14px] border border-ink bg-surface p-5 shadow-card" role="group" aria-labelledby="confirm-title">
          <p id="confirm-title" className="text-[15px] font-semibold text-ink">Start this video?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {seconds} s · {qualityLabel} presenter · {AD_LANGUAGES[language].label} · 9:16 with captions. Estimated cost <span className="font-medium text-ink">{formatUsd(estimate.total)}</span>, budget {formatUsd(budget)}.
            {config.demoMode ? " Demo mode: nothing is charged, the run is simulated." : " The real amount is shown on the project page afterwards."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="accent" size="lg" disabled={submitting || overBudget}>
              {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
              {submitting ? "Starting…" : `Start now · ${formatUsd(estimate.total)}`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            {config.demoMode
              ? "Demo mode: this starts a simulated run. No real video is generated yet."
              : "This uploads your photos and starts the real workflow. Costs are capped by the spending limits."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              href="/dashboard"
              variant="ghost"
              aria-disabled={submitting || undefined}
              className={submitting ? "pointer-events-none opacity-50" : undefined}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="lg" disabled={!hydrated || submitting || overBudget}>
              {!hydrated ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
              {!hydrated ? "Loading…" : `Generate video · ${formatUsd(estimate.total)}`}
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
