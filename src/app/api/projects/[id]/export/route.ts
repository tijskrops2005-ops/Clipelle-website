import { dataErrorResponse } from "@/lib/data/server";
import { createEditVersion } from "@/lib/data/edits";
import { ExportBody } from "@/lib/data/schemas";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly, readJson } from "../../_guard";

/** "Export" on the edit screen (2 Nov 2026): a new version of this project rendered from the recipe. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const parsed = ExportBody.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "The edit could not be read. Reload the page and try again." }, { status: 400 });
  try {
    const scope = await requireScope();
    const row = await createEditVersion(scope, id, parsed.data);
    return Response.json({ id: row.id }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
