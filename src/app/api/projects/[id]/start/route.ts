import { dataErrorResponse, startProject } from "@/lib/data/server";
import { requireUser } from "@/lib/auth";
import { databaseModeOnly } from "../../_guard";

/** Draft → processing + the workflow event. Idempotent. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const user = await requireUser();
    const row = await startProject(user.id, id);
    return Response.json({ id: row.id, status: row.status });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
