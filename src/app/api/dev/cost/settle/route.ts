import { settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../_guard";

/**
 * Lets a test page report the real cost once it knows it (e.g. HeyGen balance difference).
 * Only updates an existing entry; it can never start a paid action.
 */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: { entryId?: string; status?: "completed" | "failed"; actualUsd?: number | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.entryId || (body.status !== "completed" && body.status !== "failed")) {
    return Response.json({ error: "entryId and status (completed|failed) are required." }, { status: 400 });
  }
  const actual = typeof body.actualUsd === "number" && Number.isFinite(body.actualUsd) ? Math.max(0, body.actualUsd) : null;
  try {
    await settleSpend(body.entryId, { status: body.status, actualUsd: actual });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
