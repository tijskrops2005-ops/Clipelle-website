import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse, DataError } from "@/lib/data/server";
import { getWorkspace, inviteMember, membershipOf, revokeInvite } from "@/lib/workspaces";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ email: z.string().trim().email().max(200), role: z.enum(["member", "owner"]).default("member") });

/** Owner invites by e-mail: mailed when e-mail is configured, else the link is returned once. 20 per workspace per day. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const role = await membershipOf(id, user.id);
    const ws = role ? await getWorkspace(id) : null;
    if (!ws || !role) throw new DataError("Workspace not found.", 404, "not_found");
    if (role !== "owner") return Response.json({ error: "Only the workspace owner can invite members." }, { status: 403 });
    const limited = await rateLimit(`invites:${ws.id}`, 20, 24 * 60 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "invitations");
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter a valid e-mail address." }, { status: 400 });
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
    const invite = await inviteMember(ws, user, parsed.data.email, parsed.data.role, site);
    return Response.json(invite, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Del = z.object({ inviteId: z.string().uuid() });

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const role = await membershipOf(id, user.id);
    if (role !== "owner") return Response.json({ error: "Only the workspace owner can revoke invitations." }, { status: 403 });
    const parsed = Del.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Which invitation?" }, { status: 400 });
    await revokeInvite(id, parsed.data.inviteId);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
