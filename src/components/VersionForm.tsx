"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { useProject, useProjects, useProjectsReady } from "@/lib/data/client";
import { fetchAsFile } from "@/lib/fetchFile";
import { nextVersionNumber, versionName } from "@/lib/versions";
import { BACKGROUND_COLORS, BRAND_COLORS, CAPTION_STYLES, FONT_KEYS, HEX_COLOR, type CaptionStyle, type FontKey } from "@/lib/adOptions";
import { isAdLength } from "@/lib/pricing";
import { isAdLanguage } from "@/lib/voiceOptions";
import type { UploadedImage } from "@/components/ui/UploadDropzone";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProjectForm, type ProjectFormInitial } from "@/components/ProjectForm";

/**
 * "Make another version": opens the ad form with every setting of an earlier ad prefilled
 * (photos, product, brand style, presenter, voice, language, length, quality, tone, script) so
 * the customer changes only what they want. The result is a new project through the same
 * createAdProject route; the earlier ad is never touched.
 */
export function VersionForm({ fromId }: { fromId: string }) {
  const project = useProject(fromId);
  const all = useProjects();
  const ready = useProjectsReady();
  const [initial, setInitial] = useState<ProjectFormInitial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!project || project.workflow !== "ad" || initial) return;
    let alive = true;
    (async () => {
      const files = await Promise.all(project.imageUrls.map((url, i) => fetchAsFile(url, `product-${i + 1}`)));
      const images: UploadedImage[] = files.flatMap((file, i) => (file ? [{ id: `version-image-${i}`, file, previewUrl: URL.createObjectURL(file) }] : []));
      const logo = project.brand?.logoUrl ? await fetchAsFile(project.brand.logoUrl, "logo") : null;
      const bgImage = project.background?.type === "image" && project.background.url ? await fetchAsFile(project.background.url, "background") : null;
      if (!alive) return;
      if (images.length === 0 && project.imageUrls.length > 0) {
        setLoadError("The product photos of the earlier ad could not be loaded. Add them again below.");
      }
      const brandAccent = project.brand?.accent && HEX_COLOR.test(project.brand.accent) ? project.brand.accent.toUpperCase() : undefined;
      const swatch = brandAccent ? BRAND_COLORS.find((c) => c.value.toUpperCase() === brandAccent) : undefined;
      const colorValue = project.background?.type === "color" ? project.background.value.toLowerCase() : undefined;
      const backgroundChoice = colorValue ? (BACKGROUND_COLORS.find((c) => c.value.toLowerCase() === colorValue)?.key ?? "own") : bgImage ? "image" : "own";
      setInitial({
        parentId: project.id,
        values: {
          projectName: versionName(project.name, nextVersionNumber(all, project)),
          productName: project.productName,
          productUrl: project.productUrl ?? "",
          description: project.description,
          script: project.script ?? "",
          offer: project.offer ?? "",
          direction: project.direction ?? "",
        },
        images,
        settings: {
          seconds: project.seconds && isAdLength(project.seconds) ? project.seconds : undefined,
          engine: project.engine,
          lookId: project.lookId,
          language: isAdLanguage(project.language) ? project.language : undefined,
          voiceAccent: project.accent,
          voiceId: project.voiceId,
          speed: project.speed,
          tone: project.tone,
          backgroundChoice,
          backgroundImages: bgImage ? [{ id: "version-background", file: bgImage, previewUrl: URL.createObjectURL(bgImage) }] : [],
          accent: swatch?.value,
          customAccent: brandAccent && !swatch ? brandAccent : undefined,
          captionStyle: project.brand?.captionStyle && (CAPTION_STYLES as readonly string[]).includes(project.brand.captionStyle) ? (project.brand.captionStyle as CaptionStyle) : undefined,
          font: project.brand?.font && (FONT_KEYS as readonly string[]).includes(project.brand.font) ? (project.brand.font as FontKey) : undefined,
          logoImages: logo ? [{ id: "version-logo", file: logo, previewUrl: URL.createObjectURL(logo) }] : [],
          reviewScript: project.reviewScript,
        },
      });
    })();
    return () => {
      alive = false;
    };
    // The earlier ad is read once; later polls must not reset what the customer is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, initial]);

  if (!project || project.workflow !== "ad") {
    if (!ready) return <FormSkeleton />;
    return (
      <EmptyState
        icon={<FolderOpen className="size-6" aria-hidden />}
        title="Ad not found"
        description="The ad to make a version of could not be found. Start a new ad instead."
        action={
          <Button href="/new/ad" variant="secondary">
            <ArrowLeft className="size-4" aria-hidden />
            New ad
          </Button>
        }
      />
    );
  }
  if (!initial) return <FormSkeleton />;
  return (
    <div className="space-y-6">
      <p className="panel px-4 py-3 text-[13px] leading-relaxed text-muted">
        Everything below comes from <span className="font-medium text-ink">{project.name}</span>. Change the presenter, voice, language, length, quality, hook or tone, then generate. The earlier ad stays as it is.
        {loadError ? <span className="block text-danger">{loadError}</span> : null}
      </p>
      <ProjectForm initial={initial} />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
