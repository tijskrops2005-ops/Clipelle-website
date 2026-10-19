import { getProductClipStatus } from "@/lib/services/productClip";
import { devOnly, errorResponse } from "../../../_guard";

/** Free: queue status and, when done, the video URL. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await context.params;
  const endpointId = new URL(request.url).searchParams.get("endpoint") ?? "";
  if (!endpointId) return Response.json({ error: "Missing endpoint." }, { status: 400 });
  try {
    return Response.json(await getProductClipStatus(endpointId, id));
  } catch (error) {
    return errorResponse(error);
  }
}
