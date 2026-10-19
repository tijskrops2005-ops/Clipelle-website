import { getProductClipStatus } from "@/lib/services/productClip";
import { getEntry, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../../_guard";

/** Free: queue status and, when done, the video URL. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await context.params;
  const params = new URL(request.url).searchParams;
  const endpointId = params.get("endpoint") ?? "";
  const entryId = params.get("entry") ?? "";
  if (!endpointId) return Response.json({ error: "Missing endpoint." }, { status: 400 });
  try {
    const status = await getProductClipStatus(endpointId, id);
    // Settle the entry once the clip is done: fal.ai bills the list price per second, so the actual
    // amount is the estimate (basis "list"); /dev/costs then shows it as settled, not "pending".
    if (entryId && status.status === "COMPLETED") {
      const entry = await getEntry(entryId);
      if (entry && entry.status === "started") await settleSpend(entryId, { status: "completed", actualUsd: entry.estimatedUsd, basis: "list", meta: { requestId: id } });
    }
    if (entryId && status.status === "FAILED") await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return Response.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
