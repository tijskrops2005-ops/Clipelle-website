import { isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { readJson } from "@/app/api/projects/_guard";
import { rateQualityReport } from "@/lib/quality/server";

/** Admin only: Tijs's verdict on a quality report (good/bad, labels, a note). Everyone else gets a bare 404. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = config.demoMode ? null : await getUser();
  if (!user || !isAdmin(user.email)) return new Response(null, { status: 404 });
  const { id } = await ctx.params;
  const body = await readJson<{ rating?: "good" | "bad" | null; labels?: string[]; note?: string | null }>(request);
  if (!body) return Response.json({ ok: false, error: "Send JSON." }, { status: 400 });
  const rating = body.rating === "good" || body.rating === "bad" || body.rating === null ? body.rating : undefined;
  const result = await rateQualityReport(id, { rating, labels: Array.isArray(body.labels) ? body.labels.map(String) : undefined, note: typeof body.note === "string" || body.note === null ? body.note : undefined });
  return Response.json(result, { status: result.ok ? 200 : 404 });
}
