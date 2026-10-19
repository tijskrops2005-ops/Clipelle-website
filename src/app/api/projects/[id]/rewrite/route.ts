import { LANGUAGES } from "@/lib/languages";
import type { LanguageCode, Segment } from "@/lib/types";
import { dataErrorResponse, rewriteForProject } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";

/** "Rewrite in ad tone" on the review screen: Claude, a few cents, through the cost guard. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<{ language?: LanguageCode; segments?: Segment[] }>(request);
  if (!body?.language || !LANGUAGES.some((l) => l.code === body.language) || !Array.isArray(body.segments) || body.segments.length === 0) {
    return Response.json({ error: "language and segments are required." }, { status: 400 });
  }
  try {
    return Response.json({ segments: await rewriteForProject(id, body.language, body.segments) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
