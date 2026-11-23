import type { Project } from "@/lib/types";
import { projectCredits, projectsThisMonth } from "@/lib/projectCredits";

/**
 * The demo account's numbers, in one place (23 Nov 2026): the dashboard line, the sidebar chip, the
 * top bar, Settings → Usage and Billing all read these, so demo mode never shows two balances.
 * Simulated: no ledger behind it. Browser-safe.
 */
export const DEMO_BALANCE = 120;
export const DEMO_PLAN_KEY = "free";

/**
 * Settings → Usage in demo mode, from the demo projects themselves: the count of this month is the
 * dashboard's count, and a finished project shows the credits its own page shows (a failed one 0).
 */
export function demoUsage(projects: Project[], now: number) {
  const done = projects.filter((p) => !p.archivedAt && (p.status === "completed" || p.status === "failed"));
  return {
    balance: DEMO_BALANCE,
    projectsThisMonth: projectsThisMonth(projects, now),
    projects: done.map((p) => ({ projectId: p.id, name: p.name, workflow: p.workflow, credits: p.status === "failed" ? 0 : (p.creditsUsed ?? projectCredits(p)), last: p.createdAt })),
    ledger: [{ id: "demo", credits: DEMO_BALANCE, kind: "grant_manual", note: "Demo credits", createdAt: new Date(now).toISOString(), expiresAt: null }],
  };
}
