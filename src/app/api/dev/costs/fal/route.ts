import { connection } from "next/server";
import { falComparison } from "@/lib/falComparison";
import { devOnly, errorResponse } from "../../_guard";

/** Free: fal.ai's own billing next to what we recorded, per endpoint (src/lib/falComparison.ts). */
export async function GET(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  try {
    return Response.json(await falComparison(new URL(request.url).searchParams.get("period") === "today" ? "today" : "week"));
  } catch (error) {
    return errorResponse(error);
  }
}
