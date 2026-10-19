import { connection } from "next/server";
import { getSpendSummary } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../_guard";

/** Free: today's spend, what is left, the limits and the most recent paid actions. */
export async function GET() {
  await connection();
  const blocked = devOnly();
  if (blocked) return blocked;
  try {
    return Response.json(await getSpendSummary(12));
  } catch (error) {
    return errorResponse(error);
  }
}
