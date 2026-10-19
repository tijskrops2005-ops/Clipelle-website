import { connection } from "next/server";
import { buildCostReport } from "@/lib/costReport";
import { devOnly, errorResponse } from "../_guard";

/** Free: the full cost overview for /dev/costs, read from cost_entries. */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  try {
    return Response.json(await buildCostReport());
  } catch (error) {
    return errorResponse(error);
  }
}
