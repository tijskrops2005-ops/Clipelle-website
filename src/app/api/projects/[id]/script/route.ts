import { z } from "zod";
import { approveScript, dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";

const Body = z.object({
  hookIndex: z.number().int().min(0).max(2).default(0),
  /** Edited presenter text (data, max 2,000 chars); omitted = the generated text with the chosen hook. */
  presenterScript: z.string().trim().max(2000).optional(),
});

/** "Approve script": stores the choice/edits on the script step and lets the waiting run continue. Idempotent. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<unknown>(request);
  const parsed = Body.safeParse(body ?? {});
  if (!parsed.success) return Response.json({ error: "Invalid review." }, { status: 400 });
  try {
    const row = await approveScript(id, parsed.data);
    return Response.json({ id: row.id, status: row.status });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
