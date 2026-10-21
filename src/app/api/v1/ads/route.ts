import { z } from "zod";
import { AdBody } from "@/lib/data/schemas";
import { createDraft, getProject, startProject } from "@/lib/data/server";
import { ApiError, apiErrorResponse, authenticateApi, json, toApiProject, withIdempotency } from "@/lib/api/v1";
import { readJson } from "@/app/api/projects/_guard";
import { attachFromUrl } from "../_shared";
import type { AdLanguageCode, SpeedKey } from "@/lib/voiceOptions";

/** What the API accepts: the app's own schema plus image URLs and plain words for the quality. */
const Body = AdBody.omit({ workflow: true, engine: true, reviewScript: true }).extend({
  quality: z.enum(["standard", "premium"]).default("standard"),
  images: z.array(z.object({ url: z.string().url() })).min(1).max(5),
  logo: z.object({ url: z.string().url() }).optional(),
  background: z.object({ url: z.string().url() }).optional(),
});

/**
 * POST /api/v1/ads: creates an ad from a product and public image URLs, with the same validation,
 * credits, cost guard and workflow as the form. Optional Idempotency-Key header. Returns 201 with
 * the project (202-like: it is processing), or 200 when the key replays an earlier request.
 */
export async function POST(request: Request) {
  try {
    const caller = await authenticateApi(request);
    const raw = await readJson(request);
    if (!raw) throw new ApiError("validation_error", "Send a JSON body.", 400);
    const a = Body.parse(raw);
    const { projectId, replayed } = await withIdempotency(caller.keyId, request.headers.get("idempotency-key"), raw, async () => {
      const row = await createDraft(caller.userId, {
        workflow: "ad",
        ad: { name: a.name, seconds: a.seconds, engine: a.quality === "premium" ? "avatar_iv" : "avatar_iii", lookId: a.lookId, language: a.language as AdLanguageCode, accent: a.accent || undefined, voiceId: a.voiceId || undefined, speed: a.speed as SpeedKey, offer: a.offer || undefined, direction: a.direction || undefined, tone: a.tone, backgroundColor: a.backgroundColor, brand: a.brand, reviewScript: false, productName: a.productName, productUrl: a.productUrl || undefined, description: a.description, script: a.script || undefined },
      });
      for (const img of a.images) await attachFromUrl(caller.userId, row.id, "image", img.url, { accept: "image", maxBytes: 10 * 1024 * 1024 });
      if (a.logo) await attachFromUrl(caller.userId, row.id, "logo", a.logo.url, { accept: "image", maxBytes: 2 * 1024 * 1024 });
      if (a.background) await attachFromUrl(caller.userId, row.id, "background", a.background.url, { accept: "image", maxBytes: 10 * 1024 * 1024 });
      await startProject(caller.userId, row.id);
      return row.id;
    });
    const project = await getProject(projectId, caller.userId);
    if (!project) throw new ApiError("not_found", "Project not found.", 404);
    return json({ project: toApiProject(project) }, replayed ? 200 : 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
