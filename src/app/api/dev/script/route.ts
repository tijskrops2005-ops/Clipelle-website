import Anthropic from "@anthropic-ai/sdk";
import {
  AD_ANGLES,
  estimateScriptCost,
  generateAdScript,
  type AdAngle,
  type ScriptInput,
} from "@/lib/services/script";
import { createHash } from "node:crypto";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../_guard";

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

type Body = Partial<Omit<ScriptInput, "image">> & {
  imageDataUrl?: string;
  confirmed?: boolean;
  /** When true, only return the estimate (free). */
  estimateOnly?: boolean;
};

function parseDataUrl(dataUrl: string): { base64: string; mediaType: MediaType } | null {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1] as MediaType, base64: match[2] };
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const productName = body.productName?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  if (productName.length < 2 || description.length < 20) {
    return Response.json(
      { error: "Give a product name and a description of at least 20 characters." },
      { status: 400 },
    );
  }
  const angle = (body.angle ?? "problem_solution") as AdAngle;
  if (!AD_ANGLES.includes(angle)) {
    return Response.json({ error: "Unknown angle." }, { status: 400 });
  }
  const image = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
  if (body.imageDataUrl && !image) {
    return Response.json({ error: "Image must be a JPEG, PNG, WebP or GIF data URL." }, { status: 400 });
  }
  if (image && image.base64.length > 2_000_000) {
    return Response.json({ error: "Image is too large; the page should downscale it first." }, { status: 400 });
  }

  const base = {
    productName,
    description,
    productUrl: body.productUrl?.trim() || undefined,
    hint: body.hint?.trim() || undefined,
    language: body.language?.trim() || "en",
    targetSeconds: Math.min(60, Math.max(15, Number(body.targetSeconds) || 30)),
    angle,
  };

  const estimate = estimateScriptCost({ ...base, hasImage: Boolean(image) });
  if (body.estimateOnly) {
    return Response.json({ estimate });
  }
  // Cost rule: nothing is sent to the paid API without an explicit confirmation from the UI.
  if (body.confirmed !== true) {
    return Response.json({ error: "Confirmation required before calling the Claude API." }, { status: 400 });
  }

  // Cost guard: limits + duplicate window, before anything is charged.
  let entryId = "";
  try {
    const reserved = await reserveSpend({
      service: "anthropic",
      action: "script",
      estimatedUsd: estimate.costUsd,
      fingerprintInput: { ...base, imageHash: image ? createHash("sha256").update(image.base64).digest("hex") : null },
      meta: { language: base.language, targetSeconds: base.targetSeconds, hasImage: Boolean(image) },
    });
    entryId = reserved.entryId;
  } catch (error) {
    const refused = costGuardResponse(error);
    if (refused) return refused;
    return errorResponse(error);
  }

  try {
    const started = Date.now();
    const result = await generateAdScript({ ...base, image: image ?? undefined });
    await settleSpend(entryId, { status: "completed", actualUsd: result.costUsd, meta: result.usage });
    return Response.json({ ...result, estimate, entryId, elapsedMs: Date.now() - started });
  } catch (error) {
    await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env.local." }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Anthropic rate limit reached. Wait a moment and try again." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    return errorResponse(error);
  }
}
