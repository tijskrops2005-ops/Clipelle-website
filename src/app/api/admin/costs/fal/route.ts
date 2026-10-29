import { connection } from "next/server";
import { falComparison } from "@/lib/falComparison";
import { adminError, adminOnly } from "../../_guard";

/** Admin only: fal.ai's own billing next to what we recorded, per endpoint. */
export async function GET(request: Request) {
  await connection();
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    return Response.json(await falComparison(new URL(request.url).searchParams.get("period") === "today" ? "today" : "week"));
  } catch (error) {
    return adminError(error);
  }
}
