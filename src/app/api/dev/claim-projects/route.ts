import { eq } from "drizzle-orm";
import { assets, costEntries, db, projects, steps, translations } from "@/lib/db";
import { DEMO_USER, requireUser } from "@/lib/auth";

/**
 * Developer-only: moves every project that still belongs to the placeholder dev user (the
 * backfill in migration 0007) to the signed-in account. 404 outside development.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const user = await requireUser();
  const d = db();
  const moved = await d.update(projects).set({ ownerId: user.id }).where(eq(projects.ownerId, DEMO_USER.id)).returning({ id: projects.id });
  for (const table of [steps, assets, translations, costEntries]) {
    await d.update(table).set({ userId: user.id }).where(eq(table.userId, DEMO_USER.id));
  }
  return Response.json({ moved: moved.length });
}
