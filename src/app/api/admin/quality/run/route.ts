import { isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { readJson } from "@/app/api/projects/_guard";
import { requestQualityCheck } from "@/lib/quality/server";

/** Admin only: run the quality report (again) for one finished language version. Costs a few cents. */
export async function POST(request: Request) {
  const user = config.demoMode ? null : await getUser();
  if (!user || !isAdmin(user.email)) return new Response(null, { status: 404 });
  const body = await readJson<{ projectId?: string; language?: string }>(request);
  if (!body?.projectId || !body.language) return Response.json({ ok: false, error: "projectId and language are required." }, { status: 400 });
  const result = await requestQualityCheck(body.projectId, body.language);
  return Response.json(result, { status: result.ok ? 202 : 400 });
}
