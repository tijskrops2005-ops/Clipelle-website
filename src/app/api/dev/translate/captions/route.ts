import { buildCaptionEdit, shotstackEnv, startRender } from "@/lib/services/finalEdit";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { SHOTSTACK_USD_PER_SECOND } from "@/lib/translatePricing";
import { devOnly, errorResponse, requireRights } from "../_guard";

type Body = { videoUrl?: string; seconds?: number; srtUrl?: string; fit?: "crop" | "contain"; confirmed?: boolean; rightsConfirmed?: boolean };

/** Captions + 9:16 via Shotstack. Sandbox renders are free; production renders go through the cost guard. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rights = requireRights(body.rightsConfirmed);
  if (rights) return rights;
  const videoUrl = body.videoUrl?.trim();
  const seconds = Number(body.seconds);
  if (!videoUrl || !/^https:\/\//.test(videoUrl)) return Response.json({ error: "A public https video URL is required." }, { status: 400 });
  if (!Number.isFinite(seconds) || seconds <= 0) return Response.json({ error: "Video length (seconds) is required." }, { status: 400 });
  const env = shotstackEnv();
  if (env === "v1" && body.confirmed !== true) return Response.json({ error: "Production render requires confirmation (it costs credits)." }, { status: 400 });

  try {
    const edit = buildCaptionEdit({ videoUrl, seconds, srtUrl: body.srtUrl?.trim() || undefined, fit: body.fit === "contain" ? "contain" : "crop" });
    const estimateUsd = env === "v1" ? Math.round(seconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000 : 0;
    let entryId = "";
    if (env === "v1") {
      try {
        const reserved = await reserveSpend({ service: "shotstack", action: "translate_captions", estimatedUsd: estimateUsd, fingerprintInput: { videoUrl, srtUrl: body.srtUrl ?? null, fit: body.fit ?? "crop" }, meta: { seconds } });
        entryId = reserved.entryId;
      } catch (error) {
        const refused = costGuardResponse(error);
        if (refused) return refused;
        throw error;
      }
    }
    try {
      const render = await startRender(edit);
      return Response.json({ ...render, estimateUsd, entryId, startedAt: new Date().toISOString(), edit: { timeline: edit.timeline, output: edit.output } });
    } catch (error) {
      if (entryId) await settleSpend(entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
