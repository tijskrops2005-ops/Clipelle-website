import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { revokeShareLink } from "@/lib/shareLinks";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Revokes a viewing link: it stops working at once. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; linkId: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const { linkId } = await ctx.params;
    await revokeShareLink(await requireScope(), linkId);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
