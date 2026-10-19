import { getRender } from "@/lib/services/finalEdit";
import { devOnly, errorResponse } from "../../../_guard";

/** Free: render status and, when done, the MP4 URL (temporary, 24 h). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const { id } = await context.params;
  try {
    return Response.json(await getRender(id));
  } catch (error) {
    return errorResponse(error);
  }
}
