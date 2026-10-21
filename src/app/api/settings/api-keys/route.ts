import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { createApiKey, listApiKeys, planAllowsApiKeys } from "@/lib/apiKeys";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    await getOrCreateProfile(scope.user);
    return Response.json({ keys: await listApiKeys(scope.workspaceId), allowed: await planAllowsApiKeys(scope.workspaceId), role: scope.role, workspaceName: scope.workspaceName });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const Body = z.object({ name: z.string().trim().min(1).max(60) });

/** Creates a key and returns it once. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    if (scope.workspaceKind === "team" && scope.role !== "owner") return Response.json({ error: "Only the workspace owner can create API keys for a team." }, { status: 403 });
    await getOrCreateProfile(scope.user);
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Give the key a name (1–60 characters)." }, { status: 400 });
    return Response.json(await createApiKey(scope, parsed.data.name), { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
