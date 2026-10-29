import { connection } from "next/server";
import { buildCostReport } from "@/lib/costReport";
import { adminError, adminOnly } from "../_guard";

/** Admin only: the full cost overview for /admin/costs, read from cost_entries (the same report as /dev/costs). */
export async function GET() {
  await connection();
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    return Response.json(await buildCostReport());
  } catch (error) {
    return adminError(error);
  }
}
