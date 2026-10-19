import { LANGUAGES } from "@/lib/languages";
import type { LanguageCode, Segment } from "@/lib/types";
import { maxCharsForSegment } from "@/lib/translatePricing";
import { dataErrorResponse, saveReviewedSegments } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";

/** Saves the user's edited fragments for one language while the project waits for review. */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<{ language?: LanguageCode; segments?: Segment[] }>(request);
  if (!body?.language || !LANGUAGES.some((l) => l.code === body.language) || !Array.isArray(body.segments)) {
    return Response.json({ error: "language and segments are required." }, { status: 400 });
  }
  for (const s of body.segments) {
    if (typeof s.text !== "string" || s.text.length > maxCharsForSegment(s.start, s.end) * 2) return Response.json({ error: `Fragment ${s.index} is invalid.` }, { status: 400 });
  }
  try {
    await saveReviewedSegments(id, body.language, body.segments);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
