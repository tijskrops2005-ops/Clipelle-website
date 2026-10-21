import "server-only";
import { and, count, desc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser, type AppUser } from "@/lib/auth";
import { careerInterests, costEntries, creditLedger, db, demoRequests, profiles, projects, rateLimits, serviceRequests, steps, waitlist, workspaces } from "@/lib/db";
import { chargeOf } from "@/lib/services/costGuard";
import { CREDIT_COST_USD, PLANS, BUSINESS_TIERS } from "@/lib/plans";
import { settleCredits } from "@/lib/credits";
import { config } from "@/lib/config";

/**
 * Admin dashboard (2026-10-21): read-only aggregates for the people in ADMIN_EMAILS, plus Retry
 * and Cancel for stuck projects. Anyone else gets a plain 404. Only aggregates and project
 * metadata are shown; never a customer's photos, scripts or videos.
 */
export { adminEmails, isAdmin } from "@/lib/adminAccess";
import { isAdmin } from "@/lib/adminAccess";
/** The signed-in admin, or a 404 for everyone else (the page does not exist for them). */
export async function requireAdmin(): Promise<AppUser> {
  if (config.demoMode) notFound();
  let user: AppUser;
  try {
    user = await requireUser();
  } catch {
    notFound();
  }
  if (!isAdmin(user.email)) notFound();
  return user;
}

export type Period = "day" | "week" | "month";
export function periodStart(period: Period, now = new Date()) {
  const d = new Date(now);
  if (period === "day") d.setUTCHours(0, 0, 0, 0);
  else if (period === "week") d.setUTCDate(d.getUTCDate() - 7);
  else d.setUTCDate(d.getUTCDate() - 30);
  return d;
}

const STUCK_AFTER_MINUTES = 30;

export async function getAdminStats(period: Period) {
  const d = db();
  const since = periodStart(period);
  const dayStart = periodStart("day");
  const [users] = await d.select({ n: count() }).from(profiles);
  const [wss] = await d.select({ n: count() }).from(workspaces);
  const signups = await d.select({ day: sql<string>`to_char(${profiles.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, n: count() }).from(profiles).where(gte(profiles.createdAt, periodStart("month"))).groupBy(sql`1`).orderBy(sql`1`);
  const [freeToday] = await d.select({ n: count() }).from(profiles).where(gte(profiles.freeAdGrantedAt, dayStart));
  const byStatus = await d.select({ status: projects.status, workflow: projects.workflow, n: count() }).from(projects).where(gte(projects.createdAt, since)).groupBy(projects.status, projects.workflow);
  // Duration and failure per workflow over the period: first step start → last step end.
  const durations = await d
    .select({ workflow: projects.workflow, status: projects.status, seconds: sql<number>`extract(epoch from (max(${steps.finishedAt}) - min(${steps.startedAt})))` })
    .from(projects)
    .innerJoin(steps, eq(steps.projectId, projects.id))
    .where(and(gte(projects.createdAt, since), inArray(projects.status, ["completed", "failed"])))
    .groupBy(projects.id, projects.workflow, projects.status);
  const perWorkflow = (["ad", "translate"] as const).map((wf) => {
    const rows = durations.filter((r) => r.workflow === wf);
    const done = rows.filter((r) => r.status === "completed");
    const failed = rows.filter((r) => r.status === "failed");
    const avg = done.length ? done.reduce((s, r) => s + Number(r.seconds ?? 0), 0) / done.length : null;
    return { workflow: wf, finished: done.length, failed: failed.length, failureRate: rows.length ? failed.length / rows.length : null, avgSeconds: avg };
  });
  const costRows = await d.select({ status: costEntries.status, actualUsd: costEntries.actualUsd, estimatedUsd: costEntries.estimatedUsd }).from(costEntries).where(gte(costEntries.startedAt, since));
  const costUsd = costRows.reduce((s, r) => s + chargeOf(r), 0);
  const [granted] = await d.select({ credits: sum(creditLedger.credits) }).from(creditLedger).where(and(gte(creditLedger.createdAt, since), inArray(creditLedger.kind, ["grant_subscription", "grant_topup"])));
  const [settled] = await d.select({ credits: sum(creditLedger.credits) }).from(creditLedger).where(and(gte(creditLedger.createdAt, since), inArray(creditLedger.kind, ["reserve", "settle", "refund"])));
  const creditsSold = Number(granted?.credits ?? 0);
  const creditsUsed = -Number(settled?.credits ?? 0);
  const plansByKey = new Map<string, { monthlyUsd: number }>([...PLANS, ...BUSINESS_TIERS].map((p) => [p.key as string, p]));
  const wsByPlan = await d.select({ planKey: workspaces.planKey, n: count() }).from(workspaces).groupBy(workspaces.planKey);
  const costByPlan = await d
    .select({ planKey: workspaces.planKey, usd: sql<number>`coalesce(sum(case when ${costEntries.status} = 'completed' then coalesce(${costEntries.actualUsd}, ${costEntries.estimatedUsd}) when ${costEntries.status} = 'started' then ${costEntries.estimatedUsd} else 0 end), 0)` })
    .from(costEntries)
    .innerJoin(projects, eq(costEntries.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
    .where(gte(costEntries.startedAt, periodStart("month")))
    .groupBy(workspaces.planKey);
  const marginPerPlan = wsByPlan.map((w) => {
    const plan = plansByKey.get(w.planKey);
    const revenue = (plan?.monthlyUsd ?? 0) * Number(w.n);
    const cost = Number(costByPlan.find((c) => c.planKey === w.planKey)?.usd ?? 0);
    return { planKey: w.planKey, workspaces: Number(w.n), monthlyRevenueUsd: revenue, costUsd30d: Math.round(cost * 100) / 100, marginPct: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : null };
  });
  const expensive = await d
    .select({ projectId: costEntries.projectId, name: projects.name, workflow: projects.workflow, status: projects.status, usd: sql<number>`coalesce(sum(case when ${costEntries.status} = 'completed' then coalesce(${costEntries.actualUsd}, ${costEntries.estimatedUsd}) when ${costEntries.status} = 'started' then ${costEntries.estimatedUsd} else 0 end), 0)` })
    .from(costEntries)
    .innerJoin(projects, eq(costEntries.projectId, projects.id))
    .where(gte(costEntries.startedAt, since))
    .groupBy(costEntries.projectId, projects.name, projects.workflow, projects.status)
    .orderBy(desc(sql`3`))
    .limit(10);
  const stuckSince = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000);
  const stuck = await d.select({ id: projects.id, name: projects.name, workflow: projects.workflow, status: projects.status, updatedAt: projects.updatedAt, workspaceId: projects.workspaceId }).from(projects).where(and(inArray(projects.status, ["processing", "review"]), lt(projects.updatedAt, stuckSince))).orderBy(projects.updatedAt).limit(50);
  const [rl] = await d.select({ keys: count(), hits: sum(rateLimits.count) }).from(rateLimits).where(gte(rateLimits.windowStart, since));
  const [demo] = await d.select({ n: count() }).from(demoRequests).where(gte(demoRequests.createdAt, since));
  const [wl] = await d.select({ n: count() }).from(waitlist).where(gte(waitlist.createdAt, since));
  const [svc] = await d.select({ n: count() }).from(serviceRequests).where(gte(serviceRequests.createdAt, since));
  const [careers] = await d.select({ n: count() }).from(careerInterests).where(gte(careerInterests.createdAt, since));
  const recentDemo = await d.select({ id: demoRequests.id, kind: demoRequests.kind, name: demoRequests.name, email: demoRequests.email, company: demoRequests.company, status: demoRequests.status, createdAt: demoRequests.createdAt }).from(demoRequests).orderBy(desc(demoRequests.createdAt)).limit(10);
  const recentWaitlist = await d.select({ feature: waitlist.feature, n: count() }).from(waitlist).groupBy(waitlist.feature);
  const recentService = await d.select({ id: serviceRequests.id, name: serviceRequests.name, email: serviceRequests.email, company: serviceRequests.company, adsPerMonth: serviceRequests.adsPerMonth, status: serviceRequests.status, createdAt: serviceRequests.createdAt }).from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(10);
  return {
    period,
    since: since.toISOString(),
    users: Number(users?.n ?? 0),
    workspaces: Number(wss?.n ?? 0),
    signupsPerDay: signups.map((s) => ({ day: s.day, n: Number(s.n) })),
    freeAds: { today: Number(freeToday?.n ?? 0), cap: Number(process.env.FREE_ADS_PER_DAY ?? 10) },
    projectsByStatus: byStatus.map((r) => ({ status: r.status, workflow: r.workflow, n: Number(r.n) })),
    perWorkflow,
    money: { costUsd: Math.round(costUsd * 100) / 100, creditsSold, creditsUsed, creditsUsedUsd: Math.round(creditsUsed * CREDIT_COST_USD * 100) / 100, marginPerPlan },
    expensive: expensive.map((e) => ({ ...e, usd: Math.round(Number(e.usd) * 100) / 100 })),
    stuck: stuck.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() })),
    rateLimits: { keys: Number(rl?.keys ?? 0), hits: Number(rl?.hits ?? 0) },
    requests: { demo: Number(demo?.n ?? 0), waitlist: Number(wl?.n ?? 0), service: Number(svc?.n ?? 0), careers: Number(careers?.n ?? 0) },
    recentDemo: recentDemo.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    waitlistByFeature: recentWaitlist.map((w) => ({ feature: w.feature, n: Number(w.n) })),
    recentService: recentService.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

/** Cancel: the running step and the project become failed with a plain message; reserved credits are refunded. */
export async function adminCancelProject(projectId: string, reason = "Stopped by an administrator. Retry it when you are ready.") {
  const d = db();
  const [row] = await d.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!row) return { ok: false as const, error: "Project not found." };
  if (row.status !== "processing" && row.status !== "review") return { ok: false as const, error: "Only a running project can be cancelled." };
  await d.update(steps).set({ status: "failed", finishedAt: new Date(), error: reason, updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), inArray(steps.status, ["processing", "needs_input"])));
  await d.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, projectId));
  await settleCredits(projectId, 0, "Cancelled by an administrator").catch(() => {});
  return { ok: true as const };
}

/** Retry: cancel the stuck step, then start it again the normal way (the step's own Retry). */
export async function adminRetryProject(projectId: string) {
  const d = db();
  const [row] = await d.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!row || !row.ownerId || !row.workspaceId) return { ok: false as const, error: "Project not found." };
  if (row.status === "processing" || row.status === "review") {
    const cancelled = await adminCancelProject(projectId, "Restarted by an administrator.");
    if (!cancelled.ok) return cancelled;
  }
  const [failed] = await d.select({ key: steps.key }).from(steps).where(and(eq(steps.projectId, projectId), eq(steps.status, "failed"))).limit(1);
  if (!failed) return { ok: false as const, error: "No failed step to retry." };
  const { retryStep } = await import("@/lib/data/server");
  await retryStep({ userId: row.ownerId, workspaceId: row.workspaceId }, projectId, failed.key);
  return { ok: true as const, stepKey: failed.key };
}
