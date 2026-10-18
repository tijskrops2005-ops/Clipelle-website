"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Project } from "@/lib/types";
import { addProject } from "@/lib/mock/store";
import { fileToThumbnail } from "@/lib/mock/images";
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
 * The "New video" form. Validates on submit, disables the button while submitting
 * (rule 4: no duplicate workflow starts) and adds a simulated project to the demo store.
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
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

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
      const imageUrls = await Promise.all(images.map((img) => fileToThumbnail(img.file)));
      const now = new Date().toISOString();
      const project: Project = {
        id: `prj_${Date.now().toString(36)}`,
        name: values.projectName.trim(),
        productName: values.productName.trim(),
        productUrl: values.productUrl.trim() || undefined,
        description: values.description.trim(),
        imageUrls,
        script: values.script.trim() || undefined,
        status: "processing",
        steps: {
          vmake: { status: "processing", startedAt: now },
          heygen: { status: "processing", startedAt: now },
          veed: { status: "waiting" },
        },
        createdAt: now,
      };
      addProject(project);
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      router.push(`/projects/${project.id}`);
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

      {/* Submit row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted">
          Demo mode: this starts a simulated run. No real video is generated yet.
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
          <Button type="submit" variant="accent" size="lg" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-5" aria-hidden />
            )}
            {submitting ? "Starting…" : "Generate video"}
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
