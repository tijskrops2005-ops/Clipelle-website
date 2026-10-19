import {
  analyzeProductPhoto,
  expandToNineSixteen,
  toPreviewDataUrl,
} from "@/lib/services/productClip";
import { devOnly, errorResponse } from "../../_guard";
import { loadImage, saveImage } from "../_store";

/** Paid ($0.04): outpaint the missing area with Bria Expand, original pixels pasted back. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: { imageId?: string; prompt?: string; confirmed?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.confirmed !== true) {
    return Response.json({ error: "Confirmation required before the paid expansion." }, { status: 400 });
  }
  const original = body.imageId ? await loadImage(body.imageId, "original") : null;
  if (!original || !body.imageId) {
    return Response.json({ error: "Upload and analyse a photo first." }, { status: 400 });
  }

  try {
    const started = Date.now();
    const analysis = await analyzeProductPhoto(original);
    const result = await expandToNineSixteen(original, analysis, { prompt: body.prompt });
    await saveImage(body.imageId, "expand", result.buffer);
    return Response.json({
      preview: await toPreviewDataUrl(result.buffer, 480),
      costUsd: result.costUsd,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
