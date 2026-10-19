import { buildSrt, uploadHeygenAsset, uploadProofreadSrt, type SrtCue } from "@/lib/services/translate";
import { maxCharsForSegment } from "@/lib/translatePricing";
import { devOnly, errorResponse, requireRights } from "../../../_guard";

type Body = { cues?: SrtCue[]; rightsConfirmed?: boolean };

/**
 * Free: puts the edited subtitles back on the proofread session. The SRT is built here from the
 * cues (times unchanged), uploaded as a HeyGen asset and attached by asset id. A plan refusal
 * (Enterprise-only) comes back as HTTP 403 with code plan_required.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const cues = body.cues ?? [];
  if (cues.length === 0) return Response.json({ error: "No fragments to save." }, { status: 400 });
  for (const c of cues) {
    if (!c.text?.trim()) return Response.json({ error: `Fragment ${c.index} is empty.` }, { status: 400 });
    const max = maxCharsForSegment(c.start, c.end);
    if (c.text.length > max) return Response.json({ error: `Fragment ${c.index} is ${c.text.length} characters, above its limit of ${max}.` }, { status: 400 });
  }
  try {
    const srt = buildSrt(cues);
    const asset = await uploadHeygenAsset({ file: new Blob([srt], { type: "application/x-subrip" }), filename: `reelay-${id}.srt` });
    const proofread = await uploadProofreadSrt(id, { assetId: asset.asset_id });
    return Response.json({ ok: true, status: proofread.status, srtAssetId: asset.asset_id, bytes: srt.length });
  } catch (error) {
    return errorResponse(error);
  }
}
