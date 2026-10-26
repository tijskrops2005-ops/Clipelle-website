import { z } from "zod";
import { config } from "@/lib/config";
import { TranslateFields } from "@/lib/data/schemas";
import { createDraft, getProject, startProject } from "@/lib/data/server";
import { ApiError, apiErrorResponse, authenticateApi, json, toApiProject, withIdempotency } from "@/lib/api/v1";
import { readJson } from "@/app/api/projects/_guard";
import { attachFromUrl } from "../_shared";
import type { LanguageCode } from "@/lib/types";

/** The app's schema, minus the file name (taken from the URL), plus the video URL and its length. */
const Body = TranslateFields.omit({ workflow: true, sourceFileName: true }).extend({
  video: z.object({ url: z.string().url(), durationSeconds: z.number().positive().max(config.limits.translateVideoMaxSeconds) }),
}).refine((b) => !b.targetLanguages.includes(b.sourceLanguage), { error: "A target language cannot be the same as the spoken language." });

/** POST /api/v1/translations: translates a video you own (public URL, up to 32 MB) into one or more languages. */
export async function POST(request: Request) {
  try {
    const caller = await authenticateApi(request);
    const raw = await readJson(request);
    if (!raw) throw new ApiError("validation_error", "Send a JSON body.", 400);
    const t = Body.parse(raw);
    const { projectId, replayed } = await withIdempotency(caller.keyId, request.headers.get("idempotency-key"), raw, async () => {
      const fileName = (() => {
        try {
          return decodeURIComponent(new URL(t.video.url).pathname.split("/").pop() || "") || "video.mp4";
        } catch {
          return "video.mp4";
        }
      })();
      const row = await createDraft({ userId: caller.userId, workspaceId: caller.workspaceId }, {
        workflow: "translate",
        translate: { name: t.name, sourceFileName: fileName, sourceSeconds: t.video.durationSeconds, sourceLanguage: t.sourceLanguage as LanguageCode | "auto", targetLanguages: t.targetLanguages as LanguageCode[], quality: t.quality, keepTerms: t.keepTerms, trimSilence: t.trimSilence, captionPosition: t.captionPosition, captionStyle: t.captionStyle, removeMusic: t.removeMusic, cleanVoice: t.cleanVoice, format: t.format, enhance: t.enhance, rightsConfirmed: t.rightsConfirmed },
      });
      await attachFromUrl({ userId: caller.userId, workspaceId: caller.workspaceId }, row.id, "source", t.video.url, { accept: "video", maxBytes: config.limits.translateVideoMaxMb * 1024 * 1024, seconds: t.video.durationSeconds });
      await startProject({ userId: caller.userId, workspaceId: caller.workspaceId }, row.id);
      return row.id;
    });
    const project = await getProject(projectId, { userId: caller.userId, workspaceId: caller.workspaceId });
    if (!project) throw new ApiError("not_found", "Project not found.", 404);
    return json({ project: toApiProject(project) }, replayed ? 200 : 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
