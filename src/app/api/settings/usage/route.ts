import { connection } from "next/server";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getUsage } from "@/lib/data/profile";
import { getCreditBalance } from "@/lib/credits";
import { databaseModeOnly } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    const usage = await getUsage(scope);
    return Response.json({ ...usage, balance: await getCreditBalance(scope.workspaceId) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
