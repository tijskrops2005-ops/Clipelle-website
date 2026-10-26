import { connection } from "next/server";
import { dataErrorResponse, resultDownloadUrl } from "@/lib/data/server";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly } from "../../_guard";

/** "Download": checks the project is yours, then hands the browser the file as an attachment (`?language=` for one language version). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const { id } = await ctx.params;
  try {
    const scope = await requireScope();
    const url = await resultDownloadUrl(id, scope, new URL(request.url).searchParams.get("language"));
    if (!url) return Response.json({ error: "This video is not ready to download." }, { status: 404 });
    return Response.redirect(url, 302);
  } catch (error) {
    return dataErrorResponse(error);
  }
}
