import { dataErrorResponse } from "@/lib/data/server";
import { getBatch } from "@/lib/data/batches";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** One batch with its variants (scoped to the workspace). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const { id } = await ctx.params;
    return Response.json(await getBatch(await requireScope(), id));
  } catch (error) {
    return dataErrorResponse(error);
  }
}
