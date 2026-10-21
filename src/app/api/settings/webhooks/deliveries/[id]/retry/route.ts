import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { retryDelivery } from "@/lib/webhooks/outgoing";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Sends one delivery again (scoped to the workspace). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    const { id } = await ctx.params;
    await retryDelivery(scope, id);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
