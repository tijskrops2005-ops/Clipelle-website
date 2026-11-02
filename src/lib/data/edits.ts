import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { assets, db, projects, steps, translations, type AdInput, type EditMeta, type ProjectRow, type TranslateInput } from "@/lib/db";
import { DataError } from "@/lib/data/errors";
import { getProjectRow, AD_STEPS, TRANSLATE_STEPS, type DataScope } from "@/lib/data/server";
import { copyObject, objectPath } from "@/lib/storage";
import { CreditError, reserveCredits } from "@/lib/credits";
import { editRequested, inngest } from "@/lib/inngest/client";
import { exportCredits, keptRanges, outputSeconds, recipeSummary, type EditRecipe } from "@/lib/editRecipe";
import { VIEW_READ_ONLY_MESSAGE } from "@/lib/adminViewSession";

/**
 * Edited versions (2 Nov 2026): "Export" on the edit screen makes a new project of the same workflow
 * next to the source (same group: `parentId` = the root, the next `version`), copies the finished
 * video into it as its source, marks every earlier step done and leaves the edit step to the
 * `edit-export` job, which renders the recipe. Credits are reserved first and settled like any
 * project (`exportCredits`). One export per group at a time.
 */
export const EDIT_STEP: Record<"ad" | "translate", string> = { ad: "finalEdit", translate: "captions" };

/** Credits and the render seconds of an edited version, from its recipe. */
export function editCreditsOf(input: { edit?: EditMeta }) {
  return input.edit ? exportCredits(outputSeconds(input.edit.recipe)) : null;
}

export async function createEditVersion(scope: DataScope, sourceId: string, body: { recipe: EditRecipe; language?: string }) {
  if (scope.readOnly) throw new DataError(VIEW_READ_ONLY_MESSAGE, 403, "read_only_view");
  const source = await getProjectRow(sourceId, scope);
  if (!source) throw new DataError("Project not found.", 404, "not_found");
  if (source.status !== "completed") throw new DataError("Finish the video first; editing works on a finished video.", 409, "not_completed");
  const recipe = body.recipe;
  if (keptRanges(recipe).length === 0) throw new DataError("Nothing is left of the video after these cuts. Keep at least half a second.", 400, "empty_recipe");

  // The finished file that is edited: the ad's final video, or one language version of a translation.
  const d = db();
  let assetId: string | null = null;
  let language: string | undefined;
  if (source.workflow === "ad") {
    assetId = source.finalAssetId;
  } else {
    const input = source.input as TranslateInput;
    language = body.language ?? input.targetLanguages[0];
    const [t] = await d.select().from(translations).where(and(eq(translations.projectId, source.id), eq(translations.language, language))).limit(1);
    if (!t || t.status !== "completed") throw new DataError("That language version is not finished yet.", 409, "not_completed");
    // The version before its captions: the recipe's lines are rendered on it. An edited version keeps the copy it was made from.
    assetId = t.enhancedAssetId ?? t.videoAssetId ?? (input.edit ? input.sourceAssetId : null) ?? t.captionedAssetId;
  }
  if (!assetId) throw new DataError("The finished video is missing from storage.", 409, "missing_object");
  const [asset] = await d.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) throw new DataError("The finished video is missing from storage.", 409, "missing_object");

  // One export at a time per group (the source and every version of it).
  const rootId = source.parentId ?? source.id;
  const [running] = await d
    .select({ n: sql<number>`count(*)` })
    .from(projects)
    .where(and(eq(projects.workspaceId, scope.workspaceId), or(eq(projects.id, rootId), eq(projects.parentId, rootId)), inArray(projects.status, ["processing", "review"]), sql`${projects.input} ? 'edit'`));
  if (Number(running?.n ?? 0) > 0) throw new DataError("An export of this video is still running. Wait for it to finish, then export the next one.", 409, "export_running");
  const [top] = await d.select({ max: sql<number>`coalesce(max(${projects.version}), 1)` }).from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), or(eq(projects.id, rootId), eq(projects.parentId, rootId))));
  const version = Number(top?.max ?? 1) + 1;

  const edit: EditMeta = { sourceProjectId: source.id, ...(language ? { language } : {}), recipe };
  const summary = recipeSummary(recipe).join(", ");
  const baseName = source.name.replace(/ · v\d+( \(.*\))?$/, "");
  const name = `${baseName} · v${version} (${summary})`;
  const now = new Date();
  const sourceInput = source.input as AdInput | TranslateInput;
  const input = source.workflow === "ad"
    ? ({ ...(sourceInput as AdInput), edit } satisfies AdInput)
    : ({ ...(sourceInput as TranslateInput), targetLanguages: [language!], edit } satisfies TranslateInput);
  const [row] = await d
    .insert(projects)
    .values({
      ownerId: scope.userId,
      workspaceId: scope.workspaceId,
      workflow: source.workflow,
      name,
      status: "draft",
      parentId: rootId,
      version,
      rightsConfirmedAt: source.rightsConfirmedAt ?? now,
      detectedLanguage: source.detectedLanguage,
      input,
    })
    .returning();
  try {
    // The finished video becomes this version's source (its own copy; storage paths are unique).
    const target = objectPath({ projectId: row.id, kind: "source", fileName: `${baseName}.mp4` });
    await copyObject(asset.storagePath, target);
    const [copy] = await d
      .insert(assets)
      .values({ projectId: row.id, userId: scope.userId, kind: "source", storagePath: target, mime: asset.mime, bytes: asset.bytes, seconds: asset.seconds, width: asset.width, height: asset.height })
      .returning();
    const editStep = EDIT_STEP[source.workflow];
    const keys = source.workflow === "ad" ? AD_STEPS : TRANSLATE_STEPS;
    await d.insert(steps).values(keys.map((key) => (key === editStep ? { projectId: row.id, userId: scope.userId, key, status: "waiting" as const } : { projectId: row.id, userId: scope.userId, key, status: "completed" as const, startedAt: now, finishedAt: now, output: { copiedFrom: source.id } })));
    if (source.workflow === "translate") {
      const [t] = await d.select({ segments: translations.segments, qa: translations.qa }).from(translations).where(and(eq(translations.projectId, source.id), eq(translations.language, language!))).limit(1);
      await d.insert(translations).values({ projectId: row.id, userId: scope.userId, language: language!, status: "waiting", segments: t?.segments ?? [], qa: t?.qa ?? null });
      await d.update(projects).set({ input: { ...(input as TranslateInput), sourceAssetId: copy.id, sourceFileName: `${baseName}.mp4`, sourceSeconds: asset.seconds ?? (input as TranslateInput).sourceSeconds } }).where(eq(projects.id, row.id));
    } else {
      await d.update(projects).set({ input: { ...(input as AdInput), imageAssetIds: [] } }).where(eq(projects.id, row.id));
    }
    // Credits first, then the job.
    try {
      await reserveCredits(scope.workspaceId, scope.userId, row.id, exportCredits(outputSeconds(recipe)), `Export: ${name}`);
    } catch (error) {
      if (error instanceof CreditError) throw new DataError(error.message, error.status, error.code);
      throw error;
    }
    await d.transaction(async (tx) => {
      await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, row.id));
      await tx.update(steps).set({ status: "processing", startedAt: new Date(), attempt: 1, updatedAt: new Date() }).where(and(eq(steps.projectId, row.id), eq(steps.key, editStep)));
      if (source.workflow === "translate") await tx.update(translations).set({ status: "processing", updatedAt: new Date() }).where(eq(translations.projectId, row.id));
    });
    await inngest.send(editRequested.create({ projectId: row.id }));
  } catch (error) {
    await d.delete(projects).where(eq(projects.id, row.id)).catch(() => null);
    if (error instanceof DataError) throw error;
    throw new DataError("The export could not be started. Try again in a moment.", 503, "export_failed", error);
  }
  return (await getProjectRow(row.id, scope)) as ProjectRow;
}
