import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { deleteEndpoint } from "@/lib/webhooks/outgoing";
import { databaseModeOnly } from "@/app/api/projects/_guard";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    if (scope.workspaceKind === "team" && scope.role !== "owner") return Response.json({ error: "Only the workspace owner can manage webhooks for a team." }, { status: 403 });
    const { id } = await ctx.params;
    await deleteEndpoint(scope, id);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
