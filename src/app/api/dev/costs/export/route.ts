import { connection } from "next/server";
import { buildCostReport, reportToCsv } from "@/lib/costReport";
import { devOnly, errorResponse } from "../../_guard";

/** Free: every paid call as CSV (newest first). */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const csv = reportToCsv(await buildCostReport());
    const name = `clipelle-costs-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
  } catch (error) {
    return errorResponse(error);
  }
}
