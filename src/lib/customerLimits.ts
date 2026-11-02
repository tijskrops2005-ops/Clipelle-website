/**
 * Per-customer limits an administrator can raise (2 Nov 2026): spend per day and per month (USD,
 * the cost guard's per-user limits) and the number of projects running at once. 0 or missing means
 * the plan's default. Nothing ever goes above the hard caps from the environment, whatever an
 * administrator types. Browser-safe: no secrets, pure functions, used by the admin form and the server.
 */
export type CustomerLimits = { dailyUsd?: number; monthlyUsd?: number; concurrentProjects?: number };

export type LimitCaps = { dailyUsd: number; monthlyUsd: number; concurrentProjects: number };

/** The hard caps: ADMIN_LIMIT_CAP_DAILY_USD, ADMIN_LIMIT_CAP_MONTHLY_USD, ADMIN_LIMIT_CAP_CONCURRENT. */
export function limitCaps(env: Record<string, string | undefined> = process.env): LimitCaps {
  const n = (key: string, fallback: number) => {
    const v = Number(env[key]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return { dailyUsd: n("ADMIN_LIMIT_CAP_DAILY_USD", 500), monthlyUsd: n("ADMIN_LIMIT_CAP_MONTHLY_USD", 5000), concurrentProjects: n("ADMIN_LIMIT_CAP_CONCURRENT", 50) };
}

/** Cleans what the form sent: whole numbers, 0 = default, never above the cap, nothing else kept. */
export function normalizeLimits(input: Partial<Record<keyof CustomerLimits, unknown>>, caps: LimitCaps = limitCaps()): CustomerLimits {
  const clean = (v: unknown, cap: number) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, cap);
  };
  const out: CustomerLimits = {};
  const daily = clean(input.dailyUsd, caps.dailyUsd);
  const monthly = clean(input.monthlyUsd, caps.monthlyUsd);
  const concurrent = clean(input.concurrentProjects, caps.concurrentProjects);
  if (daily) out.dailyUsd = daily;
  if (monthly) out.monthlyUsd = monthly;
  if (concurrent) out.concurrentProjects = concurrent;
  return out;
}

/** The limit that applies: the customer's own when set and higher than the default, else the default. */
export function effectiveLimit(custom: number | undefined, planDefault: number, cap: number): number {
  const own = custom && custom > 0 ? Math.min(custom, cap) : 0;
  return own > planDefault ? own : planDefault;
}
