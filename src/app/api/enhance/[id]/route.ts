import { connection } from "next/server";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getEnhanceJobRow, toClientJob } from "@/lib/data/enhance";
import { databaseModeOnly } from "../../projects/_guard";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const { id } = await ctx.params;
  try {
    const scope = await requireScope();
    const row = await getEnhanceJobRow(scope, id);
    if (!row) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json({ job: await toClientJob(row) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
