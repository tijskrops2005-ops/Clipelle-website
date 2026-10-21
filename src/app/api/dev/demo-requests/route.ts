import { desc } from "drizzle-orm";
import { db, demoRequests } from "@/lib/db";

/** Developer-only list of demo and contact requests. 404 outside development. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const rows = await db().select().from(demoRequests).orderBy(desc(demoRequests.createdAt)).limit(200);
  return Response.json(rows);
}
