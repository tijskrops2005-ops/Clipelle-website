import { balanceOf, getAccount } from "@/lib/services/heygen";
import { downloadProofreadSrt, fetchSrtText, getProofread, parseSrt } from "@/lib/services/translate";
import { devOnly, errorResponse } from "../../_guard";

/** Free: status of one proofread session; when completed, the subtitle cues are included. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const proofread = await getProofread(id);
    let cues = null;
    let srtUrl: string | null = null;
    if (proofread.status === "completed") {
      const srt = await downloadProofreadSrt(id);
      srtUrl = srt.srt_url;
      cues = parseSrt(await fetchSrtText(srt.srt_url));
    }
    const balance = proofread.status !== "processing" ? balanceOf(await getAccount()) : undefined;
    return Response.json({
      id: proofread.id,
      status: proofread.status,
      inputLanguage: proofread.input_language ?? null,
      outputLanguage: proofread.output_language ?? null,
      failureMessage: proofread.failure_message ?? null,
      cues,
      srtUrl,
      balance,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
