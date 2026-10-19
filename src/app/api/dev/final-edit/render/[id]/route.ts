import { getRender } from "@/lib/services/finalEdit";
import { settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../../_guard";

/** Free: render status and, when done, the MP4 URL (temporary, 24 h). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await context.params;
  const entryId = new URL(request.url).searchParams.get("entry") ?? "";
  try {
    const render = await getRender(id);
    if (entryId && render.status === "done") await settleSpend(entryId, { status: "completed" });
    if (entryId && render.status === "failed") await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return Response.json(render);
  } catch (error) {
    return errorResponse(error);
  }
}
