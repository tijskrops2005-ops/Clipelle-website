import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse, DataError } from "@/lib/data/server";
import { deleteWorkspace, getWorkspace, leaveWorkspace, listInvites, listMembers, membershipOf, renameWorkspace, transferOwnership, usagePerMember, WORKSPACE_COOKIE } from "@/lib/workspaces";
import { getCreditBalance } from "@/lib/credits";
import { db, profiles } from "@/lib/db";
import { inArray } from "drizzle-orm";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

async function load(id: string, userId: string) {
  const role = await membershipOf(id, userId);
  const ws = role ? await getWorkspace(id) : null;
  if (!ws || !role) throw new DataError("Workspace not found.", 404, "not_found");
  return { ws, role };
}

/** The Team page: members with names, pending invites, per-member usage (owner), balance. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { ws, role } = await load(id, user.id);
    const members = await listMembers(ws.id);
    const ids = members.map((m) => m.userId);
    const people = ids.length ? await db().select({ userId: profiles.userId, email: profiles.email, name: profiles.name }).from(profiles).where(inArray(profiles.userId, ids)) : [];
    const usage = role === "owner" ? await usagePerMember(ws.id) : [];
    return Response.json({
      workspace: { id: ws.id, name: ws.name, kind: ws.kind, planKey: ws.planKey, ownerUserId: ws.ownerUserId },
      role,
      balance: await getCreditBalance(ws.id),
      members: members.map((m) => ({ ...m, email: people.find((p) => p.userId === m.userId)?.email ?? "", name: people.find((p) => p.userId === m.userId)?.name ?? null, usedThisMonth: usage.find((u) => u.userId === m.userId)?.used ?? 0, projectsThisMonth: usage.find((u) => u.userId === m.userId)?.projects ?? 0 })),
      invites: role === "owner" ? await listInvites(ws.id) : [],
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Patch = z.union([z.object({ action: z.literal("rename"), name: z.string().trim().min(2).max(60) }), z.object({ action: z.literal("transfer"), toUserId: z.string().min(1) }), z.object({ action: z.literal("leave") })]);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { ws, role } = await load(id, user.id);
    const parsed = Patch.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Unknown action." }, { status: 400 });
    const b = parsed.data;
    if (b.action === "leave") {
      await leaveWorkspace(ws, user.id);
      (await cookies()).delete(WORKSPACE_COOKIE);
      return Response.json({ ok: true, left: true });
    }
    if (role !== "owner") return Response.json({ error: "Only the workspace owner can do this." }, { status: 403 });
    if (b.action === "rename") await renameWorkspace(ws.id, b.name);
    if (b.action === "transfer") await transferOwnership(ws, user.id, b.toUserId);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Delete = z.object({ confirmName: z.string() });

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { ws } = await load(id, user.id);
    const parsed = Delete.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Type the workspace name to confirm." }, { status: 400 });
    await deleteWorkspace(ws, user.id, parsed.data.confirmName);
    (await cookies()).delete(WORKSPACE_COOKIE);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
