"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { config } from "@/lib/config";
import { createAdProject } from "@/lib/data/client";
import { useHydrated } from "@/lib/useHydrated";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { AD_LENGTHS, DEFAULTS, DEFAULT_AD_SECONDS, estimateAdCost, formatUsd, type AdLength } from "@/lib/pricing";
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
  });
  const [seconds, setSeconds] = useState<AdLength>(DEFAULT_AD_SECONDS);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  // Before React is attached a click would submit the form natively and reload the page with nothing saved.
  const hydrated = useHydrated();
  const budget = Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) > 0 ? Number(process.env.NEXT_PUBLIC_MAX_COST_PER_CREATIVE_USD) : 1.5;
  const estimateFor = (len: AdLength) => estimateAdCost({ seconds: len, clipModel: DEFAULTS.clipModel, engine: DEFAULTS.engine });
  const estimate = estimateFor(seconds);
  const overBudget = estimate.total > budget;
  const lengthsWithinBudget = AD_LENGTHS.filter((len) => estimateFor(len).total <= budget);

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
      return;
    }

    submitLock.current = true;
    setSubmitting(true);

    try {
      const { id } = await createAdProject({
        name: values.projectName.trim(),
        seconds,
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
          <p className="label-mono text-muted">Step 1 of 2</p>
          <CardTitle className="mt-2 text-xl">Your product</CardTitle>
          <p className="mt-1 text-[15px] text-muted">
            Clear photos are the single biggest factor in a good product clip.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field id="images" label="Product images" error={errors.images}>
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

      {/* 2. Details that shape the script and the final edit */}
      <Card>
        <CardHeader>
          <p className="label-mono text-muted">Step 2 of 2</p>
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

          <Field id="seconds" label="Video length" hint="The presenter talks the whole video. The estimate below follows your choice.">
            <select
              id="seconds"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value) as AdLength)}
              disabled={submitting}
              className={`${controlClass} ${controlStateClass(false)} h-11`}
            >
              {AD_LENGTHS.map((len) => (
                <option key={len} value={len}>
                  {len} seconds · about {formatUsd(estimateFor(len).total)}{estimateFor(len).total > budget ? " · over budget" : ""}
                </option>
              ))}
            </select>
          </Field>

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
            Script {formatUsd(estimate.parts.script)} · product clip {formatUsd(estimate.parts.clip)} (+{formatUsd(estimate.parts.expand)} if the photo needs expanding) · presenter {seconds} s {formatUsd(estimate.parts.presenter)} · captions and edit {formatUsd(estimate.parts.captions)}.
          </p>
          {overBudget && (
            <p className="mt-1.5 text-[13px] font-medium text-danger">
              A {seconds}-second video is above the budget, so it cannot start.{" "}
              {lengthsWithinBudget.length > 0 ? `Choose ${lengthsWithinBudget.join(" or ")} seconds.` : "No length fits the current budget."}
            </p>
          )}
        </div>
        <Badge tone={overBudget ? "danger" : "success"}>{overBudget ? "over budget" : "within budget"}</Badge>
      </div>

      {/* Submit row */}
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
            {submitting || !hydrated ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-5" aria-hidden />
            )}
            {!hydrated ? "Loading…" : submitting ? "Starting…" : "Generate video"}
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
