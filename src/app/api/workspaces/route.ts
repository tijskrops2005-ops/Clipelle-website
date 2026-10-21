import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { createTeamWorkspace, listWorkspacesFor } from "@/lib/workspaces";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    return Response.json({ current: scope.workspaceId, workspaces: await listWorkspacesFor(scope.userId) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({ name: z.string().trim().min(2).max(60) });

/** Creates a team workspace (free plan until the owner picks Business in Billing). 5 per account per day. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    const limited = await rateLimit(`workspaces:create:${scope.userId}`, 5, 24 * 60 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "new workspaces");
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Give the workspace a name (2–60 characters)." }, { status: 400 });
    const ws = await createTeamWorkspace(scope.user, parsed.data.name);
    return Response.json({ id: ws.id, name: ws.name, kind: ws.kind }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
