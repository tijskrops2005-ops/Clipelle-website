import { connection } from "next/server";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getEnhanceJobRow } from "@/lib/data/enhance";
import { signedDownloadUrl } from "@/lib/storage";
import { databaseModeOnly } from "../../../projects/_guard";

/** "Download": checks the job is yours, then hands the browser the enhanced file as an attachment. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const { id } = await ctx.params;
  try {
    const scope = await requireScope();
    const row = await getEnhanceJobRow(scope, id);
    if (!row || row.status !== "completed" || !row.resultPath) return Response.json({ error: "This file is not ready to download." }, { status: 404 });
    const ext = row.resultPath.split(".").pop() ?? "mp4";
    const base = row.fileName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 80) || "clipelle";
    return Response.redirect(await signedDownloadUrl(row.resultPath, 600, `${base}-enhanced.${ext}`), 302);
  } catch (error) {
    return dataErrorResponse(error);
  }
}
