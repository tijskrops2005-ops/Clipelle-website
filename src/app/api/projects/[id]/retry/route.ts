import { dataErrorResponse, retryStep } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";

/** Retries one failed step; the workflow resumes from there. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<{ stepKey?: string }>(request);
  if (!body?.stepKey) return Response.json({ error: "stepKey is required." }, { status: 400 });
  try {
    await retryStep(id, body.stepKey);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
