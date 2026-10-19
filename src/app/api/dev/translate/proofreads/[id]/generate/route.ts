import type { TranslationQuality } from "@/lib/types";
import { balanceOf, getAccount } from "@/lib/services/heygen";
import { estimateGenerateUsd, generateFromProofread } from "@/lib/services/translate";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse, requireRights } from "../../../_guard";

type Body = { seconds?: number; mode?: TranslationQuality; confirmed?: boolean; rightsConfirmed?: boolean };

/** Paid: renders the translated video from the approved subtitles of one proofread session. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rights = requireRights(body.rightsConfirmed);
  if (rights) return rights;
  if (body.confirmed !== true) return Response.json({ error: "Confirmation required before rendering a paid translation." }, { status: 400 });
  const seconds = Number(body.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return Response.json({ error: "Video length (seconds) is required." }, { status: 400 });
  const mode: TranslationQuality = body.mode === "precision" ? "precision" : "speed";

  try {
    const estimateUsd = estimateGenerateUsd(seconds, mode);
    let entryId = "";
    let fingerprint = "";
    try {
      const reserved = await reserveSpend({
        service: "heygen",
        action: "translate_generate",
        estimatedUsd: estimateUsd,
        fingerprintInput: { proofreadId: id },
        meta: { seconds, mode },
      });
      entryId = reserved.entryId;
      fingerprint = reserved.fingerprint;
    } catch (error) {
      const refused = costGuardResponse(error);
      if (refused) return refused;
      throw error;
    }
    const before = balanceOf(await getAccount());
    try {
      const created = await generateFromProofread(id, { idempotencyKey: fingerprint });
      return Response.json({ translationId: created.video_translation_id, status: created.status ?? "processing", balanceBefore: before, estimateUsd, entryId, startedAt: new Date().toISOString() });
    } catch (error) {
      await settleSpend(entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
