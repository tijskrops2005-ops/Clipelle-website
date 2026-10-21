import { connection } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { requireScope } from "@/lib/auth";
import { apiKeys, db, profiles, projects, workspaceInvites, workspaceMembers } from "@/lib/db";
import { dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** The first-time checklist on the dashboard: what the account has done so far (booleans only). */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    const d = db();
    const [ads] = await d.select({ n: count() }).from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), eq(projects.workflow, "ad")));
    const [tr] = await d.select({ n: count() }).from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), eq(projects.workflow, "translate")));
    const [me] = await d.select({ brand: profiles.brand }).from(profiles).where(eq(profiles.userId, scope.userId)).limit(1);
    const [members] = await d.select({ n: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, scope.workspaceId));
    const [invites] = await d.select({ n: count() }).from(workspaceInvites).where(eq(workspaceInvites.workspaceId, scope.workspaceId));
    const [keys] = await d.select({ n: count() }).from(apiKeys).where(eq(apiKeys.workspaceId, scope.workspaceId));
    const brand = me?.brand ?? {};
    return Response.json({
      firstAd: Number(ads?.n ?? 0) > 0,
      brand: Boolean(brand.accent || brand.captionStyle || brand.font || brand.logoPath),
      translation: Number(tr?.n ?? 0) > 0,
      team: Number(members?.n ?? 0) > 1 || Number(invites?.n ?? 0) > 0,
      apiKey: Number(keys?.n ?? 0) > 0,
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
