import { and, eq } from "drizzle-orm";
import { inngest, qualityCheckRequested } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { assets, projects, qualityReports, translations, type TranslateInput } from "@/lib/db/schema";
import { signedDownloadUrl } from "@/lib/storage";
import { reserveSpend, settleSpend, type ReserveInput } from "@/lib/services/costGuard";
import { extractFrame, EXTRACT_FRAME_USD } from "@/lib/services/textLocate";
import { REVIEW_FRAMES_USD, REVIEW_MEANING_USD, reviewFrames, reviewMeaning, transcribeVideo, TRANSCRIBE_USD_PER_SECOND } from "@/lib/services/qualityReview";
import { lengthCheck, scoreReport, skipped, spokenCheck, type QualityCheck } from "@/lib/quality/report";
import { captionStyleOf } from "@/lib/captionOptions";
import { languageOf } from "@/lib/languages";
import type { Segment } from "@/lib/types";

/**
 * The quality report of one finished language version (28 Oct 2026). Runs after the video is
 * delivered and never holds it up; admin only (/admin/quality). Each check runs in its own step and
 * a check that cannot run is "skipped" with the reason, so one service being down never loses the
 * rest. About $0.03–0.05 per video, every paid call through the cost guard.
 */

type Loaded = {
  reportId: string;
  finalPath: string;
  lines: { index: number; source: string; final: string; start: number; end: number }[];
  wishes: string | null;
  captionsOn: boolean;
  overRemovedText: boolean;
  sourceSeconds: number;
  targetLabel: string;
};

/** Reserve, run, settle: a refused or failed paid call becomes a skipped check, never a crash. */
async function paid<T>(reserve: ReserveInput, run: () => Promise<{ value: T; actualUsd: number }>): Promise<{ value: T; costUsd: number } | { error: string }> {
  let entryId: string;
  try {
    entryId = (await reserveSpend(reserve)).entryId;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The spending guard refused this check." };
  }
  try {
    const { value, actualUsd } = await run();
    await settleSpend(entryId, { status: "completed", actualUsd, basis: "tokens" });
    return { value, costUsd: actualUsd };
  } catch (error) {
    await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return { error: error instanceof Error ? error.message : "The check failed." };
  }
}

export const qualityReport = inngest.createFunction(
  { id: "quality-report", name: "Quality report of a finished translation", retries: 1, concurrency: { key: "event.data.projectId", limit: 2 }, triggers: [qualityCheckRequested] },
  async ({ event, step }) => {
    const { projectId, language } = event.data;

    const loaded = await step.run("load", async (): Promise<Loaded | { skip: string }> => {
      const [p] = await db().select({ input: projects.input }).from(projects).where(eq(projects.id, projectId)).limit(1);
      const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, language))).limit(1);
      if (!p || !t) return { skip: "Project or language not found." };
      if (t.status !== "completed") return { skip: `The language version is ${t.status}.` };
      const assetId = t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId;
      if (!assetId) return { skip: "No finished video." };
      const [a] = await db().select({ path: assets.storagePath }).from(assets).where(eq(assets.id, assetId)).limit(1);
      if (!a) return { skip: "No finished video." };
      const input = p.input as TranslateInput;
      const segments = (t.segments ?? []) as Segment[];
      const [row] = await db().insert(qualityReports).values({ projectId, language, status: "running" }).returning({ id: qualityReports.id });
      return {
        reportId: row.id,
        finalPath: a.path,
        lines: segments.map((s) => ({ index: s.index, source: s.original ?? "", final: s.text, start: s.start, end: s.end })),
        wishes: input.instructions?.trim() || null,
        captionsOn: captionStyleOf(input.captionStyle).show,
        overRemovedText: Boolean(input.removeText),
        sourceSeconds: input.sourceSeconds,
        targetLabel: languageOf(language).label,
      };
    });
    if ("skip" in loaded) return loaded;
    const base = { projectId, language, languageCount: 1 } as const;

    const frames = await step.run("frames", async () => {
      const url = await signedDownloadUrl(loaded.finalPath, 3600);
      const grabbed = await paid<{ first: string; middle: string; last: string }>({ ...base, service: "fal", action: "quality_frames", estimatedUsd: EXTRACT_FRAME_USD * 3, fingerprintInput: { report: loaded.reportId, frames: true } }, async () => {
        const [first, middle, last] = await Promise.all((["first", "middle", "last"] as const).map((f) => extractFrame(url, f)));
        return { value: { first, middle, last }, actualUsd: EXTRACT_FRAME_USD * 3 };
      });
      if ("error" in grabbed) return { checks: [skipped("ending", `Frames could not be taken: ${grabbed.error}`)], costUsd: 0 };
      const reviewed = await paid<QualityCheck[]>({ ...base, service: "anthropic", action: "quality_frames_review", estimatedUsd: REVIEW_FRAMES_USD, fingerprintInput: { report: loaded.reportId, review: "frames" } }, async () => {
        const r = await reviewFrames({ ...grabbed.value, captionsOn: loaded.captionsOn, overRemovedText: loaded.overRemovedText });
        return { value: r.checks, actualUsd: r.costUsd };
      });
      if ("error" in reviewed) return { checks: [skipped("ending", `The frames could not be reviewed: ${reviewed.error}`)], costUsd: grabbed.costUsd };
      return { checks: reviewed.value, costUsd: grabbed.costUsd + reviewed.costUsd, frames: grabbed.value };
    });

    const meaning = await step.run("meaning", async () => {
      if (!loaded.lines.some((l) => l.source.trim())) return { checks: [skipped("meaning", "No source text was available for this video, so meaning could not be compared.")], costUsd: 0 };
      const r = await paid<QualityCheck>({ ...base, service: "anthropic", action: "quality_meaning", estimatedUsd: REVIEW_MEANING_USD, fingerprintInput: { report: loaded.reportId, review: "meaning" } }, async () => {
        const out = await reviewMeaning({ lines: loaded.lines, targetLanguage: loaded.targetLabel, wishes: loaded.wishes ?? undefined });
        return { value: out.check, actualUsd: out.costUsd };
      });
      return "error" in r ? { checks: [skipped("meaning", `The meaning review could not run: ${r.error}`)], costUsd: 0 } : { checks: [r.value], costUsd: r.costUsd };
    });

    const spoken = await step.run("spoken", async () => {
      const url = await signedDownloadUrl(loaded.finalPath, 3600);
      const seconds = Math.max(1, loaded.sourceSeconds);
      const r = await paid<{ text: string; seconds: number | null; spokenEnd: number | null }>({ ...base, service: "heygen", action: "quality_transcribe", estimatedUsd: Math.round(seconds * TRANSCRIBE_USD_PER_SECOND * 10000) / 10000, fingerprintInput: { report: loaded.reportId, review: "spoken" } }, async () => {
        const t = await transcribeVideo(url, `quality:${loaded.reportId}`);
        return { value: { text: t.text, seconds: t.seconds, spokenEnd: t.spokenEnd }, actualUsd: Math.round((t.seconds ?? seconds) * TRANSCRIBE_USD_PER_SECOND * 10000) / 10000 };
      });
      if ("error" in r) return { checks: [skipped("spoken", `The audio could not be transcribed: ${r.error}`), skipped("length", "Needs the transcription.")], costUsd: 0, heard: null };
      const checks = [spokenCheck(loaded.lines.map((l) => l.final).join(" "), r.value.text)];
      if (r.value.seconds) checks.push(lengthCheck(loaded.sourceSeconds, r.value.seconds, r.value.spokenEnd));
      return { checks, costUsd: r.costUsd, heard: r.value.text };
    });

    return step.run("save", async () => {
      const checks = [...meaning.checks, ...spoken.checks, ...frames.checks];
      const score = scoreReport(checks);
      const costUsd = Math.round((frames.costUsd + meaning.costUsd + spoken.costUsd) * 10000) / 10000;
      await db()
        .update(qualityReports)
        .set({ status: "completed", score, checks, costUsd, facts: { heard: spoken.heard, frames: "frames" in frames ? frames.frames : null }, updatedAt: new Date() })
        .where(eq(qualityReports.id, loaded.reportId));
      return { reportId: loaded.reportId, score };
    });
  },
);
