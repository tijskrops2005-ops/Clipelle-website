import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse, DataError } from "@/lib/data/server";
import { getWorkspace, membershipOf, removeMember } from "@/lib/workspaces";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ userId: z.string().min(1) });

/** Owner removes a member; access ends immediately (the member's cookie no longer resolves). */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const role = await membershipOf(id, user.id);
    const ws = role ? await getWorkspace(id) : null;
    if (!ws || !role) throw new DataError("Workspace not found.", 404, "not_found");
    if (role !== "owner") return Response.json({ error: "Only the workspace owner can remove members." }, { status: 403 });
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Which member?" }, { status: 400 });
    await removeMember(ws, parsed.data.userId);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
