import { getRender } from "@/lib/services/finalEdit";
import { devOnly, errorResponse } from "../../_guard";

/** Free: status of a Shotstack render. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const r = await getRender(id);
    return Response.json({ id: r.id, status: r.status, url: r.url ?? null, duration: r.duration ?? null, renderTime: r.renderTime ?? null, error: r.error ?? null, poster: r.poster ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
