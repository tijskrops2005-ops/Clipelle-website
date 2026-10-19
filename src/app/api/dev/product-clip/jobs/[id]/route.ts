import { getProductClipStatus } from "@/lib/services/productClip";
import { settleSpend } from "@/lib/services/costGuard";
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
    // Settle the cost entry once; the log ignores repeated settles of the same outcome harmlessly.
    if (entryId && status.status === "COMPLETED") await settleSpend(entryId, { status: "completed" });
    if (entryId && status.status === "FAILED") await settleSpend(entryId, { status: "failed", actualUsd: 0 });
    return Response.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
