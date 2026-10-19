import { balanceOf, getAccount } from "@/lib/services/heygen";
import { getTranslation } from "@/lib/services/translate";
import { devOnly, errorResponse } from "../../_guard";

/** Free: status of a translation render; includes the balance once it is finished. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const t = await getTranslation(id);
    const done = t.status === "completed" || t.status === "failed";
    return Response.json({
      id: t.id,
      status: t.status,
      videoUrl: t.video_url ?? null,
      srtUrl: t.srt_caption_url ?? null,
      vttUrl: t.vtt_caption_url ?? null,
      failureMessage: t.failure_message ?? null,
      balance: done ? balanceOf(await getAccount()) : undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
