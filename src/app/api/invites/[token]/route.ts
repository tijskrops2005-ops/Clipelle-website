import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { acceptInvite, inviteByToken, WORKSPACE_COOKIE } from "@/lib/workspaces";
import { rateLimit, tooManyRequests, clientIp, hashIp } from "@/lib/rateLimit";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** What an invitation is for (workspace name, e-mail, validity); no sign-in needed to look. */
export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const limited = await rateLimit(`invite-look:${hashIp(clientIp(request))}`, 30, 10 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
    const { token } = await ctx.params;
    const found = await inviteByToken(token);
    if (!found) return Response.json({ error: "This invitation does not exist." }, { status: 404 });
    const user = await getUser();
    return Response.json({ workspace: { name: found.workspace.name }, email: found.invite.email, role: found.invite.role, valid: found.valid, signedInAs: user?.email ?? null });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Accepts the invitation for the signed-in user and switches to that workspace. */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const limited = await rateLimit(`invite-accept:${hashIp(clientIp(request))}`, 10, 10 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in first.", code: "unauthorized" }, { status: 401 });
    const { token } = await ctx.params;
    const ws = await acceptInvite(user, token);
    (await cookies()).set(WORKSPACE_COOKIE, ws.id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 365 * 24 * 3600, secure: process.env.NODE_ENV === "production" });
    return Response.json({ ok: true, workspace: { id: ws.id, name: ws.name } });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
