import { dataErrorResponse, startProject } from "@/lib/data/server";
import { databaseModeOnly } from "../../_guard";

/** Draft → processing + the workflow event. Idempotent. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  try {
    const row = await startProject(id);
    return Response.json({ id: row.id, status: row.status });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
