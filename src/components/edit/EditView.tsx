"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, FolderOpen, Loader2, Scissors, Sparkles, Type } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Project, TranslateProject } from "@/lib/types";
import { exportEdit, useProject, useProjects, useProjectsReady } from "@/lib/data/client";
import { getAccountStatus, getBrandDefaults } from "@/lib/data/settingsClient";
import { defaultRecipe, exportCredits, keptRanges, outputSeconds, recipeSummary, type EditRecipe } from "@/lib/editRecipe";
import { TOPUP_USD_PER_CREDIT } from "@/lib/plans";
import { languageOf } from "@/lib/languages";
import { clearDraft, readDraft, writeDraft } from "@/lib/forms/formDraft";
import { useDraftScope } from "@/lib/forms/DraftScope";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectSkeleton } from "@/components/ProjectView";
import { DemoBadge } from "@/components/DemoModeBadge";
import { formatDuration } from "@/components/ui/VideoDropzone";
import { EditPreview } from "./EditPreview";
import { EditTimeline } from "./EditTimeline";
import { CaptionsPanel } from "./CaptionsPanel";
import { OverlaysPanel } from "./OverlaysPanel";

type Tab = "cut" | "captions" | "text";

/**
 * The edit screen (2 Nov 2026): a finished video, a live HTML preview, a timeline to trim and cut,
 * the caption lines and style (translations), text and logo, and one Export button that makes a
 * new version through the existing edit step. What the customer changes is a recipe
 * (src/lib/editRecipe.ts), kept in this browser until the export starts.
 */
export function EditView({ id }: { id: string }) {
  const project = useProject(id);
  const ready = useProjectsReady();
  if (!project) {
    if (!ready) return <ProjectSkeleton />;
    return <EmptyState icon={<FolderOpen className="size-6" aria-hidden />} title="Project not found" description="It may have been removed, or the link is incomplete." action={<Button href="/projects" variant="secondary"><ArrowLeft className="size-4" aria-hidden /> Projects</Button>} />;
  }
  if (project.status !== "completed") {
    return <EmptyState icon={<Scissors className="size-6" aria-hidden />} title="Editing starts when the video is ready" description="Trim, cut, captions, text and a logo work on the finished video." action={<Button href={`/projects/${project.id}`} variant="secondary"><ArrowLeft className="size-4" aria-hidden /> Back to the project</Button>} />;
  }
  return <Editor project={project} />;
}

function Editor({ project }: { project: Project }) {
  const isTranslate = project.workflow === "translate";
  const finished = isTranslate ? (project as TranslateProject).translations.filter((t) => t.status === "completed" && t.videoUrl) : [];
  const [language, setLanguage] = useState<string | undefined>(finished[0]?.language);
  const version = isTranslate ? finished.find((t) => t.language === language) ?? finished[0] : undefined;
  const draftKey = `edit:${project.id}:${version?.language ?? "ad"}`;
  // A new language version is its own editor (own draft, own clock): the key remounts it.
  return <EditorBody key={draftKey} project={project} version={version} draftKey={draftKey} languages={finished.map((t) => t.language)} onLanguage={setLanguage} />;
}

function EditorBody({ project, version, draftKey, languages, onLanguage }: { project: Project; version: TranslateProject["translations"][number] | undefined; draftKey: string; languages: string[]; onLanguage: (code: string) => void }) {
  const router = useRouter();
  const all = useProjects();
  const draftScope = useDraftScope();
  const isTranslate = project.workflow === "translate";
  const language = version?.language;
  // Translations are edited on the video before its captions (the captions come from the lines here); ads carry theirs in the picture.
  const src = isTranslate ? version?.rawVideoUrl ?? version?.videoUrl : project.workflow === "ad" ? project.finalVideoUrl : undefined;
  const captionsAreBurnedIn = !isTranslate || (isTranslate && !version?.rawVideoUrl && !config.demoMode);
  const sourceSeconds = isTranslate ? (project as TranslateProject).sourceSeconds : (project.workflow === "ad" ? project.seconds : 30) ?? 30;

  function fresh(): EditRecipe {
    if (isTranslate && version) {
      const p = project as TranslateProject;
      return defaultRecipe(sourceSeconds, { cues: version.segments.map((s) => ({ index: s.index, start: s.start, end: s.end, text: s.text })), style: p.captionStyle, position: p.captionPosition });
    }
    return defaultRecipe(sourceSeconds);
  }
  // This editor only renders in the browser (the project list arrives after mount), so the draft can be read at once.
  const [restored, setRestored] = useState(() => Boolean(draftScope && readDraft<EditRecipe>(draftKey, draftScope)?.data?.v === 1));
  const [recipe, setRecipeState] = useState<EditRecipe>(() => (draftScope ? readDraft<EditRecipe>(draftKey, draftScope)?.data : undefined) ?? fresh());
  const setRecipe = useCallback((next: EditRecipe) => {
    setRecipeState(next);
    if (draftScope) writeDraft(draftKey, draftScope, next);
  }, [draftKey, draftScope]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(t, recipe.sourceSeconds));
    if (v) v.currentTime = clamped;
    setTime(clamped);
  }, [recipe.sourceSeconds]);
  // The video's real length wins over the stored seconds (natural pace can stretch a translation).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onMeta() {
      const d = v!.duration;
      if (!Number.isFinite(d) || d <= 0 || Math.abs(d - recipe.sourceSeconds) < 0.3) return;
      const atEnd = recipe.trim.end >= recipe.sourceSeconds - 0.05;
      const seconds = Math.round(d * 10) / 10;
      setRecipe({ ...recipe, sourceSeconds: seconds, trim: { start: Math.min(recipe.trim.start, seconds - 0.5), end: atEnd ? seconds : Math.min(recipe.trim.end, seconds) } });
    }
    v.addEventListener("loadedmetadata", onMeta);
    if (v.readyState >= 1) onMeta();
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [recipe, setRecipe, src]);

  const [tab, setTab] = useState<Tab>("cut");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getBrandDefaults().then((b) => alive && setLogoUrl(b.logoUrl ?? null)).catch(() => {});
    if (!config.demoMode) getAccountStatus().then((a) => alive && setBalance(a.balance)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const seconds = outputSeconds(recipe);
  const credits = exportCredits(seconds);
  const rootId = project.edit ? project.parentId ?? project.id : project.id;
  const exportRunning = all.some((p) => p.id !== project.id && Boolean(p.edit) && p.status === "processing" && (p.id === rootId || p.parentId === rootId));
  const nothingLeft = keptRanges(recipe).length === 0;
  const shortOfCredits = balance !== null && balance < credits;
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = recipeSummary(recipe);

  async function onExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const { id } = await exportEdit(project.id, recipe, language);
      if (draftScope) clearDraft(draftKey, draftScope);
      router.push(`/projects/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The export could not be started. Try again.");
      setExporting(false);
    }
  }

  if (!src) {
    return <EmptyState icon={<Scissors className="size-6" aria-hidden />} title="No finished video to edit" description="Once a language version is ready it can be edited here." action={<Button href={`/projects/${project.id}`} variant="secondary"><ArrowLeft className="size-4" aria-hidden /> Back to the project</Button>} />;
  }

  const tabs: { key: Tab; label: string; icon: typeof Scissors; hidden?: boolean }[] = [
    { key: "cut", label: "Trim & cut", icon: Scissors },
    { key: "captions", label: "Captions", icon: Type, hidden: captionsAreBurnedIn || !recipe.captions },
    { key: "text", label: "Text & logo", icon: Sparkles },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href={`/projects/${project.id}`} className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {project.name}
          </Link>
        }
        title="Edit video"
        badge={<DemoBadge>Demo</DemoBadge>}
        description="Trim, cut, change the captions, add a line of text or your logo. Export makes a new version; the original stays as it is."
        actions={
          isTranslate && languages.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Language version">
              {languages.map((code) => (
                <button key={code} type="button" role="radio" aria-checked={code === language} onClick={() => onLanguage(code)} className={cn("focus-ring rounded-full border px-3 py-1 text-[13px] font-medium transition-colors", code === language ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink hover:border-ink/40")}>
                  {languageOf(code).label}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        {/* preview */}
        <div className="space-y-4 xl:sticky xl:top-6">
          <EditPreview src={src} recipe={recipe} time={time} onTime={setTime} videoRef={videoRef} logoUrl={logoUrl} aspect={isTranslate && (project as TranslateProject).format === "original" ? "original" : "9:16"} captionsAreBurnedIn={captionsAreBurnedIn} />
          {restored && <p className="text-center text-[13px] text-muted" role="status">Picked up where you left off. <button type="button" onClick={() => { setRecipe(fresh()); setRestored(false); }} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Start over</button></p>}
          {captionsAreBurnedIn && isTranslate && <p className="text-center text-[13px] text-muted">The captions of this version are part of the picture; its text cannot be changed here.</p>}
        </div>

        {/* tools */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-card bg-surface p-5 shadow-card sm:p-6">
            <EditTimeline src={src} recipe={recipe} time={time} onSeek={seek} onRecipe={setRecipe} disabled={exporting} />
          </section>
          <section className="rounded-card bg-surface shadow-card">
            <div className="flex gap-1 border-b border-divider p-2" role="tablist" aria-label="Edit tools">
              {tabs.filter((t) => !t.hidden).map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn("focus-ring inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium transition-colors", tab === t.key ? "bg-ink text-surface" : "text-muted hover:bg-surface-muted hover:text-ink")}>
                  <t.icon className="size-4" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-5 sm:p-6">
              {tab === "cut" && (
                <div className="space-y-2 text-[14px] text-muted">
                  <p>Use the strip above: drag the start and end, or press <span className="text-ink">Cut from here</span> at one point and <span className="text-ink">Cut until here</span> at another to take a piece out. The preview skips what is cut.</p>
                  <p>The export keeps {formatDuration(seconds)} of {formatDuration(recipe.sourceSeconds)}{keptRanges(recipe).length > 1 ? ` in ${keptRanges(recipe).length} pieces` : ""}.</p>
                </div>
              )}
              {tab === "captions" && <CaptionsPanel recipe={recipe} onRecipe={setRecipe} time={time} onSeek={seek} disabled={exporting} />}
              {tab === "text" && <OverlaysPanel recipe={recipe} onRecipe={setRecipe} time={time} logoUrl={logoUrl} disabled={exporting} />}
            </div>
          </section>

          {/* export */}
          <section className="rounded-card bg-surface p-5 shadow-card sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">Export as a new version</p>
                <p className="text-[13px] text-muted">{summary.join(" · ")} · {formatDuration(seconds)} · <span className="text-ink">{credits} credits</span> (≈ ${(credits * TOPUP_USD_PER_CREDIT).toFixed(2)} at the pack price){balance !== null ? ` · ${balance.toLocaleString("en-US")} available` : ""}</p>
                {exportRunning && <p className="mt-1 text-[13px] text-warning">An export of this video is still running; the next one can start when it is done.</p>}
                {shortOfCredits && <p className="mt-1 text-[13px] text-danger">Not enough credits. Add credits in Billing to export.</p>}
                {nothingLeft && <p className="mt-1 text-[13px] text-danger">Nothing is left of the video. Keep at least half a second.</p>}
                {error && <p role="alert" className="mt-1 text-[13px] text-danger">{error}</p>}
              </div>
              <Button type="button" variant="accent" size="lg" onClick={onExport} disabled={exporting || exportRunning || nothingLeft || shortOfCredits} className="shrink-0">
                {exporting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
                {exporting ? "Starting…" : `Export · ${credits} credits`}
              </Button>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">The export takes about a minute. {config.demoMode ? "Demo: simulated, nothing is charged." : "Credits are only charged for a finished export."}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
