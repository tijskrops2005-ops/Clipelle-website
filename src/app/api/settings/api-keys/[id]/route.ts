import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { revokeApiKey } from "@/lib/apiKeys";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Revokes a key; calls with it fail from now on. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await revokeApiKey(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
