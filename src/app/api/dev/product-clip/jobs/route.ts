import {
  CLIP_MODELS,
  CLIP_SECONDS,
  estimateClipCost,
  submitProductClip,
  type ClipModelKey,
} from "@/lib/services/productClip";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../_guard";
import { loadImage } from "../_store";

/** Paid: submit the 9:16 image to an image-to-video model on fal.ai. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: { imageId?: string; method?: "crop" | "expand"; model?: string; prompt?: string; confirmed?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.confirmed !== true) {
    return Response.json({ error: "Confirmation required before creating a paid clip." }, { status: 400 });
  }
  const model = body.model as ClipModelKey;
  if (!CLIP_MODELS[model]) {
    return Response.json({ error: "Choose a model." }, { status: 400 });
  }
  const method = body.method === "expand" ? "expand" : "crop";
  const image = body.imageId ? await loadImage(body.imageId, method) : null;
  if (!image) {
    return Response.json({ error: `No ${method} image found. Analyse the photo first${method === "expand" ? " and run the expansion" : ""}.` }, { status: 400 });
  }
  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length > 1000) {
    return Response.json({ error: "Give a prompt of 1–1000 characters." }, { status: 400 });
  }

  const estimateUsd = estimateClipCost(model);
  let entryId = "";
  try {
    const reserved = await reserveSpend({
      service: "fal",
      action: `clip_${model}`,
      estimatedUsd: estimateUsd,
      fingerprintInput: { imageId: body.imageId, method, model, prompt },
      meta: { model, method },
    });
    entryId = reserved.entryId;
  } catch (error) {
    const refused = costGuardResponse(error);
    if (refused) return refused;
    return errorResponse(error);
  }

  try {
    const job = await submitProductClip({ image, model, prompt, durationSeconds: CLIP_SECONDS });
    return Response.json({
      ...job,
      model,
      durationSeconds: CLIP_SECONDS,
      estimateUsd,
      entryId,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return errorResponse(error);
  }
}
