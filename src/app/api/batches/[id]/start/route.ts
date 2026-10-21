import { dataErrorResponse } from "@/lib/data/server";
import { startBatch } from "@/lib/data/batches";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Starts every variant of the batch: limits and balance for the total first, then one run per project. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const { id } = await ctx.params;
    const result = await startBatch(await requireScope(), id);
    return Response.json({ id: result.batch.id, started: result.started, failed: result.failed, already: result.already });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
