import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { buildDataExport } from "@/lib/dataExport";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** "Download your data": one JSON file of the signed-in account's own data; three per day. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    const limited = await rateLimit(`export:${scope.user.id}`, 3, 24 * 60 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "exports");
    const data = await buildDataExport(scope.user);
    const name = `clipelle-data-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
