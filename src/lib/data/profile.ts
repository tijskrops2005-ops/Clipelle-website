import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { costEntries, creditLedger, db, notifyWishes, profiles, projects, type ProfileRow } from "@/lib/db";
import { chargeOf } from "@/lib/services/costGuard";
import { listLedger } from "@/lib/credits";

export type BrandDefaults = { accent?: string; captionStyle?: string; font?: string; logoPath?: string };

/** The profile row, created on first use from the auth user. */
export async function getOrCreateProfile(user: { id: string; email: string; name?: string }): Promise<ProfileRow> {
  const d = db();
  const [row] = await d.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (row) return row;
  const [created] = await d
    .insert(profiles)
    .values({ userId: user.id, email: user.email, name: user.name ?? null })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await d.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return again;
}

export async function updateProfileName(userId: string, name: string | null) {
  await db().update(profiles).set({ name, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

export async function getBrandDefaults(userId: string): Promise<BrandDefaults> {
  const [row] = await db().select({ brand: profiles.brand }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row?.brand ?? {};
}

export async function saveBrandDefaults(userId: string, brand: BrandDefaults) {
  await db().update(profiles).set({ brand, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

export async function addNotifyWish(userId: string, feature: string) {
  await db().insert(notifyWishes).values({ userId, feature }).onConflictDoNothing();
}

export async function listNotifyWishes(userId: string) {
  const rows = await db().select({ feature: notifyWishes.feature }).from(notifyWishes).where(eq(notifyWishes.userId, userId));
  return rows.map((r) => r.feature);
}

/** Usage per project for the signed-in user, from cost_entries, plus the credit ledger. */
export async function getUsage(userId: string) {
  const d = db();
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const rows = await d
    .select({ id: costEntries.id, projectId: costEntries.projectId, service: costEntries.service, action: costEntries.action, estimatedUsd: costEntries.estimatedUsd, actualUsd: costEntries.actualUsd, status: costEntries.status, startedAt: costEntries.startedAt, name: projects.name, workflow: projects.workflow })
    .from(costEntries)
    .leftJoin(projects, eq(costEntries.projectId, projects.id))
    .where(and(eq(costEntries.userId, userId), gte(costEntries.startedAt, since)))
    .orderBy(desc(costEntries.startedAt))
    .limit(1000);
  const perProject = new Map<string, { projectId: string; name: string; workflow: string; usd: number; calls: number; last: Date }>();
  for (const r of rows) {
    const key = r.projectId ?? "none";
    const usd = chargeOf({ status: r.status, actualUsd: r.actualUsd, estimatedUsd: r.estimatedUsd });
    const cur = perProject.get(key) ?? { projectId: key, name: r.name ?? "Test calls", workflow: r.workflow ?? "", usd: 0, calls: 0, last: r.startedAt };
    cur.usd = Math.round((cur.usd + usd) * 10000) / 10000;
    cur.calls += 1;
    if (r.startedAt > cur.last) cur.last = r.startedAt;
    perProject.set(key, cur);
  }
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const [m] = await d.select({ n: sql<number>`count(*)` }).from(projects).where(and(eq(projects.ownerId, userId), gte(projects.createdAt, month)));
  return { projects: [...perProject.values()].sort((a, b) => b.last.getTime() - a.last.getTime()), projectsThisMonth: Number(m?.n ?? 0), ledger: await listLedger(userId, 50) };
}

/** Deletes everything of one account: projects (cascade), the credit ledger (credits are forfeited), wishes, profile. Auth user is deleted by the caller. */
export async function deleteAccountData(userId: string) {
  const d = db();
  await d.delete(projects).where(eq(projects.ownerId, userId));
  await d.delete(creditLedger).where(eq(creditLedger.userId, userId));
  await d.delete(notifyWishes).where(eq(notifyWishes.userId, userId));
  await d.delete(profiles).where(eq(profiles.userId, userId));
}
