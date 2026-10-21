import { adminCancelProject, adminRetryProject, isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { readJson } from "@/app/api/projects/_guard";

/** Admin only: Retry or Cancel a stuck project. Everyone else gets a bare 404. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = config.demoMode ? null : await getUser();
  if (!user || !isAdmin(user.email)) return new Response(null, { status: 404 });
  const { id } = await ctx.params;
  const body = await readJson<{ action?: string }>(request);
  const result = body?.action === "retry" ? await adminRetryProject(id) : body?.action === "cancel" ? await adminCancelProject(id) : { ok: false as const, error: "action must be retry or cancel." };
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
