import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { membershipOf, WORKSPACE_COOKIE } from "@/lib/workspaces";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ workspaceId: z.string().uuid() });

/** Remembers the current workspace in a cookie; only a workspace the user is a member of. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Unknown workspace." }, { status: 400 });
    const role = await membershipOf(parsed.data.workspaceId, user.id);
    if (!role) return Response.json({ error: "You are not a member of that workspace." }, { status: 404 });
    const store = await cookies();
    store.set(WORKSPACE_COOKIE, parsed.data.workspaceId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 365 * 24 * 3600, secure: process.env.NODE_ENV === "production" });
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
