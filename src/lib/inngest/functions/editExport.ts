import { editRequested, inngest } from "@/lib/inngest/client";
import { and, eq } from "drizzle-orm";
import { assets, db, profiles, projects, translations, type AdInput, type EditMeta, type TranslateInput } from "@/lib/db";
import { buildEditFromRecipe, outputSeconds, recipeCues } from "@/lib/editRecipe";
import { buildSrt } from "@/lib/services/translate";
import { getRender, shotstackEnv, startRender } from "@/lib/services/finalEdit";
import { reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { SHOTSTACK_USD_PER_SECOND } from "@/lib/translatePricing";
import { workflowSettings as cfg } from "@/lib/workflow/settings";
import { failStep, loadAsset, loadProject, loadStep, markCompleted, markProcessing, providerUrl, setProjectFinal, storeBytes, storeFromUrl, waitForJob, withDeadline, withRetries } from "@/lib/workflow/steps";
import { signedDownloadUrl } from "@/lib/storage";
import { callbackUrlFor } from "@/lib/webhooks/incoming";
import { EDIT_STEP } from "@/lib/data/edits";

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];
const MAX_POLLS = 120;

/**
 * Edited version (2 Nov 2026): the one paid step of an export. The recipe (trim, cuts, caption lines
 * and style, text, call to action, logo) becomes one render job on the copied finished video; the
 * result is stored as the version's final video and the credits settle like any project.
 */
export const editExport = inngest.createFunction(
  {
    id: "edit-export",
    name: "Edited version: render the recipe",
    retries: 0,
    concurrency: { limit: 1, key: "event.data.projectId" },
    triggers: [editRequested],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId;
    const project = await step.run("load-project", () => loadProject(projectId));
    if (project.status === "completed") return { skipped: "already completed" };
    const input = project.input as AdInput | TranslateInput;
    const edit = input.edit;
    if (!edit) return { skipped: "not an edited version" };
    const key = EDIT_STEP[project.workflow];
    const fail = (message: string) => failStep(projectId, key, new Error(message));

    const render = await step.run("edit-submit", () => withDeadline("Starting the export", 10, async (): Promise<{ renderId: string; entryId: string; estimate: number; stepId: string; seconds: number } | { error: string }> => {
      try {
        const stepRow = await loadStep(projectId, key);
        if (stepRow.status === "completed") return { error: "" };
        await markProcessing(projectId, key);
        const source = await sourceAssetOf(projectId, project.workflow, edit, input);
        const videoUrl = await providerUrl(source);
        // Captions on the output's clock, stored as this version's SRT.
        const cues = recipeCues(edit.recipe);
        let srtUrl: string | undefined;
        if (cues.length > 0) {
          const srt = await storeBytes({ projectId, stepId: stepRow.id, kind: "srt", data: new TextEncoder().encode(buildSrt(cues)), mime: "application/x-subrip", fileName: `captions-edited.srt`, language: edit.language });
          srtUrl = await providerUrl(srt);
        }
        // The brand logo from Settings → Brand, when the recipe asks for it and there is one.
        let logoUrl: string | undefined;
        if (edit.recipe.logo?.enabled && project.ownerId) {
          const [p] = await db().select({ brand: profiles.brand }).from(profiles).where(eq(profiles.userId, project.ownerId)).limit(1);
          if (p?.brand?.logoPath) logoUrl = await signedDownloadUrl(p.brand.logoPath, 6 * 3600);
        }
        const size = project.workflow === "translate" && (input as TranslateInput).format === "original" && source.width && source.height ? { width: source.width, height: source.height } : undefined;
        const job = buildEditFromRecipe(edit.recipe, { videoUrl, srtUrl, logoUrl, size });
        const estimate = Math.round(job.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
        const reserved = await reserveSpend({ service: "shotstack", action: "edit_export", estimatedUsd: estimate, fingerprintInput: { projectId, recipe: edit.recipe }, projectId, stepId: stepRow.id, language: edit.language, meta: { env: shotstackEnv(), seconds: job.meta.totalSeconds, pieces: job.meta.pieces } });
        try {
          const r = await withRetries("Starting the export", () => startRender(job, callbackUrlFor("shotstack")));
          return { renderId: r.renderId, entryId: reserved.entryId, estimate, stepId: stepRow.id, seconds: job.meta.totalSeconds };
        } catch (error) {
          await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
          throw error;
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    }));
    if ("error" in render) {
      if (render.error === "") return { skipped: "already rendered" };
      return fail(render.error);
    }

    for (let i = 0; i < MAX_POLLS; i++) {
      const r = await step.run(`edit-status-${i}`, async () => {
        const x = await getRender(render.renderId);
        return { status: x.status, url: x.url ?? null, duration: x.duration ?? null, error: x.error ?? null };
      });
      if (r.status === "done" && r.url) {
        const stored = await step.run("edit-store", () => withDeadline("Saving the exported video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
          try {
            const seconds = r.duration ?? outputSeconds(edit.recipe);
            const asset = await storeFromUrl({ projectId, stepId: render.stepId, kind: project.workflow === "ad" ? "final" : "captioned", url: r.url!, fileName: "edited.mp4", language: edit.language, seconds, fallbackMime: "video/mp4" });
            await settleSpend(render.entryId, { status: "completed", actualUsd: render.estimate });
            await markCompleted(projectId, key, { output: { assetId: asset.id, seconds }, externalJobId: render.renderId, costUsd: render.estimate });
            if (project.workflow === "translate") {
              await db().update(translations).set({ captionedAssetId: asset.id, status: "completed", error: null, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, edit.language ?? "")));
              await db().update(projects).set({ status: "completed", updatedAt: new Date() }).where(eq(projects.id, projectId));
              const { settleProjectCredits, afterProjectEnd } = await import("@/lib/workflow/steps");
              await settleProjectCredits(projectId);
              await afterProjectEnd(projectId);
            } else {
              await setProjectFinal(projectId, asset.id);
            }
            return { assetId: asset.id };
          } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
          }
        }));
        if ("error" in stored) return fail(stored.error);
        return { ok: true, assetId: stored.assetId };
      }
      if (r.status === "failed") {
        await step.run("edit-failed", () => settleSpend(render.entryId, { status: "failed", actualUsd: 0 }));
        return fail(`The export failed: ${r.error || "unknown reason"}. Try again; nothing was charged.`);
      }
      await waitForJob(step as StepTools, `edit-wait-${i}`, "shotstack", render.renderId, cfg.pollSeconds);
    }
    return fail(`The export took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
  },
);

/** The copied finished video this version edits: its own "source" asset (ads too), with a fallback to the original's file. */
async function sourceAssetOf(projectId: string, workflow: "ad" | "translate", edit: EditMeta, input: AdInput | TranslateInput) {
  if (workflow === "translate" && (input as TranslateInput).sourceAssetId) return loadAsset((input as TranslateInput).sourceAssetId);
  const [own] = await db().select().from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "source"))).limit(1);
  if (own) return own;
  const [src] = await db().select({ finalAssetId: projects.finalAssetId }).from(projects).where(eq(projects.id, edit.sourceProjectId)).limit(1);
  if (!src?.finalAssetId) throw new Error("The video to edit is missing from storage.");
  return loadAsset(src.finalAssetId);
}
