import type { LanguageCode } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { estimateRewriteUsd, rewriteSegmentsInAdTone, type ToneSegment } from "@/lib/services/adTone";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../_guard";

type Body = { segments?: ToneSegment[]; language?: LanguageCode; confirmed?: boolean; estimateOnly?: boolean };

/** Paid (cents): Claude rewrites the fragments in ad tone within their character limits. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const segments = (body.segments ?? []).filter((s) => typeof s.text === "string" && Number.isFinite(s.start) && Number.isFinite(s.end));
  if (segments.length === 0 || segments.length > 200) return Response.json({ error: "Send 1–200 fragments." }, { status: 400 });
  const language = body.language;
  if (!language || !LANGUAGES.some((l) => l.code === language)) return Response.json({ error: "Unknown target language." }, { status: 400 });
  const estimateUsd = estimateRewriteUsd(segments);
  if (body.estimateOnly) return Response.json({ estimateUsd });
  if (body.confirmed !== true) return Response.json({ error: "Confirmation required before calling Claude.", estimateUsd }, { status: 400 });

  let entryId = "";
  try {
    const reserved = await reserveSpend({
      service: "anthropic",
      action: "translate_rewrite",
      estimatedUsd: estimateUsd,
      fingerprintInput: { language, text: segments.map((s) => s.text) },
      meta: { fragments: segments.length, language },
    });
    entryId = reserved.entryId;
  } catch (error) {
    const refused = costGuardResponse(error);
    if (refused) return refused;
    return errorResponse(error);
  }
  try {
    const result = await rewriteSegmentsInAdTone({ segments, language });
    await settleSpend(entryId, { status: "completed", actualUsd: result.costUsd, basis: "tokens", meta: { usage: result.usage } });
    return Response.json({ ...result, estimateUsd, entryId });
  } catch (error) {
    await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return errorResponse(error);
  }
}
