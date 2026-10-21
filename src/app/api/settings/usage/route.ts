import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getUsage } from "@/lib/data/profile";
import { getCreditBalance } from "@/lib/credits";
import { databaseModeOnly } from "@/app/api/projects/_guard";

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const user = await requireUser();
    const usage = await getUsage(user.id);
    return Response.json({ ...usage, balance: await getCreditBalance(user.id) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
