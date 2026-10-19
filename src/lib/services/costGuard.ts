/**
 * Central cost guard for every paid API call (HeyGen, Claude, fal.ai, Shotstack production).
 * Server-only by usage: imported from route handlers, services and the orchestrator, never from client code.
 *
 * Two limits from .env.local:
 * - MAX_COST_PER_ACTION_USD (default 1.50): no single paid call may cost more.
 * - MAX_COST_PER_CREATIVE_USD (default 1.50): what one click on "Generate video" may cost in total.
 *   Workflow A: the whole project. Workflow B: per language version (shared costs such as the
 *   source transcript are split evenly over the languages). Every paid call counts, including
 *   failed attempts and retries.
 * Plus: the same request fingerprint within 10 minutes is not run again.
 *
 * Usage: `const { entryId } = await reserveSpend(...)` BEFORE the paid call; it throws CostGuardError
 * when a limit or duplicate blocks it. Then `await settleSpend(entryId, { status, actualUsd })`.
 */
import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { costEntries, db, type CostEntryRow } from "@/lib/db";

export type CostService = "heygen" | "anthropic" | "fal" | "shotstack";
export type EntryStatus = "started" | "completed" | "failed";

export type CostEntry = {
  id: string;
  service: CostService;
  action: string;
  estimatedUsd: number;
  actualUsd: number | null;
  status: EntryStatus;
  fingerprint: string;
  startedAt: string;
  finishedAt: string | null;
  projectId?: string | null;
  stepId?: string | null;
  language?: string | null;
  meta?: Record<string, unknown>;
};

export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export type CostGuardCode = "per_action_limit" | "creative_budget" | "duplicate";

export class CostGuardError extends Error {
  readonly code: CostGuardCode;
  readonly details: Record<string, unknown>;
  constructor(message: string, code: CostGuardCode, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "CostGuardError";
    this.code = code;
    this.details = details;
  }
}

/* ---------- config ---------- */

function envNumber(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function costLimits() {
  return {
    maxPerActionUsd: envNumber("MAX_COST_PER_ACTION_USD", 1.5),
    maxPerCreativeUsd: envNumber("MAX_COST_PER_CREATIVE_USD", 1.5),
  };
}

/* ---------- storage (table cost_entries) ---------- */

function toEntry(r: CostEntryRow): CostEntry {
  return {
    id: r.id,
    service: r.service,
    action: r.action,
    estimatedUsd: r.estimatedUsd,
    actualUsd: r.actualUsd,
    status: r.status,
    fingerprint: r.fingerprint,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    projectId: r.projectId,
    stepId: r.stepId,
    language: r.language,
    meta: r.meta ?? undefined,
  };
}

/** Newest first. */
export async function listEntries(limit = 200): Promise<CostEntry[]> {
  const rows = await db().select().from(costEntries).orderBy(desc(costEntries.startedAt)).limit(limit);
  return rows.map(toEntry);
}

/** Entries of one project, newest first. */
export async function listProjectEntries(projectId: string): Promise<CostEntry[]> {
  const rows = await db().select().from(costEntries).where(eq(costEntries.projectId, projectId)).orderBy(desc(costEntries.startedAt));
  return rows.map(toEntry);
}

/* ---------- helpers ---------- */

/** Local calendar day (the server's timezone), e.g. "2026-10-19". */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** What an entry counts for: the real cost when known, otherwise the estimate (reserved). Failed = what it actually cost (usually 0). */
export function chargeOf(e: Pick<CostEntry, "status" | "actualUsd" | "estimatedUsd">) {
  if (e.status === "failed") return e.actualUsd ?? 0;
  return e.actualUsd ?? e.estimatedUsd;
}

export function fingerprintOf(service: CostService, action: string, input: unknown) {
  const raw = JSON.stringify({ service, action, input });
  return createHash("sha256").update(raw).digest("hex");
}

export const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/* ---------- per-project / per-language spend ---------- */

export type ProjectSpend = {
  totalUsd: number;
  /** Costs not tied to one language (Workflow A: everything; B: e.g. the source transcript). */
  sharedUsd: number;
  byLanguage: Record<string, number>;
};

export async function getProjectSpend(projectId: string): Promise<ProjectSpend> {
  const rows = await db().select().from(costEntries).where(eq(costEntries.projectId, projectId));
  const byLanguage: Record<string, number> = {};
  let shared = 0;
  let total = 0;
  for (const r of rows) {
    const c = chargeOf(r);
    total += c;
    if (r.language) byLanguage[r.language] = (byLanguage[r.language] ?? 0) + c;
    else shared += c;
  }
  return { totalUsd: round4(total), sharedUsd: round4(shared), byLanguage: Object.fromEntries(Object.entries(byLanguage).map(([k, v]) => [k, round4(v)])) };
}

/** Spent so far for one creative: the project (A) or one language version plus its share of shared costs (B). */
export function creativeSpent(spend: ProjectSpend, language: string | null | undefined, languageCount: number) {
  if (!language) return spend.totalUsd;
  return round4((spend.byLanguage[language] ?? 0) + spend.sharedUsd / Math.max(1, languageCount));
}

/* ---------- public API ---------- */

export type SpendSummary = {
  day: string;
  spentTodayUsd: number;
  actionsToday: number;
  maxPerActionUsd: number;
  maxPerCreativeUsd: number;
  recent: CostEntry[];
};

export async function getSpendSummary(recentLimit = 10): Promise<SpendSummary> {
  const limits = costLimits();
  const today = await db().select().from(costEntries).where(gte(costEntries.startedAt, startOfToday()));
  return {
    day: todayKey(),
    spentTodayUsd: round4(today.reduce((sum, e) => sum + chargeOf(e), 0)),
    actionsToday: today.length,
    maxPerActionUsd: limits.maxPerActionUsd,
    maxPerCreativeUsd: limits.maxPerCreativeUsd,
    recent: await listEntries(recentLimit),
  };
}

export type ReserveInput = {
  service: CostService;
  action: string;
  estimatedUsd: number;
  /** The request inputs that make two calls "the same". */
  fingerprintInput: unknown;
  /** Set by the orchestrator so costs add up per project and the creative budget applies. */
  projectId?: string | null;
  stepId?: string | null;
  /** Workflow B: the language version this call belongs to (budget per language). */
  language?: string | null;
  /** Workflow B: number of language versions, to split shared costs. */
  languageCount?: number;
  meta?: Record<string, unknown>;
};

/**
 * Checks the limits, the creative budget and the duplicate window, then records the action as started.
 * Throws CostGuardError with a plain-language message when the call must not run.
 */
export async function reserveSpend(input: ReserveInput): Promise<{ entryId: string; fingerprint: string; summary: SpendSummary }> {
  const limits = costLimits();
  const estimated = round4(Math.max(0, input.estimatedUsd));
  const summary = await getSpendSummary(5);

  if (estimated > limits.maxPerActionUsd) {
    throw new CostGuardError(
      `This action is estimated at $${estimated.toFixed(2)}, above the limit of $${limits.maxPerActionUsd.toFixed(2)} per action. Make it smaller or raise MAX_COST_PER_ACTION_USD in .env.local.`,
      "per_action_limit",
      { estimatedUsd: estimated, maxPerActionUsd: limits.maxPerActionUsd },
    );
  }

  if (input.projectId) {
    const spend = await getProjectSpend(input.projectId);
    const spent = creativeSpent(spend, input.language, input.languageCount ?? 1);
    if (spent + estimated > limits.maxPerCreativeUsd) {
      const what = input.language ? `the ${input.language.toUpperCase()} version` : "this video";
      throw new CostGuardError(
        `This step would bring the total for ${what} to $${(spent + estimated).toFixed(2)}, above the budget of $${limits.maxPerCreativeUsd.toFixed(2)} per video. Spent so far: $${spent.toFixed(2)}.`,
        "creative_budget",
        { spentUsd: spent, estimatedUsd: estimated, maxPerCreativeUsd: limits.maxPerCreativeUsd, language: input.language ?? null },
      );
    }
  }

  const fingerprint = fingerprintOf(input.service, input.action, input.fingerprintInput);
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const [twin] = await db()
    .select()
    .from(costEntries)
    .where(and(eq(costEntries.fingerprint, fingerprint), gte(costEntries.startedAt, cutoff), sql`${costEntries.status} <> 'failed'`))
    .orderBy(desc(costEntries.startedAt))
    .limit(1);
  if (twin) {
    const minutes = Math.max(1, Math.round((Date.now() - twin.startedAt.getTime()) / 60_000));
    throw new CostGuardError(
      `The same request was already ${twin.status === "started" ? "started" : "completed"} ${minutes} minute${minutes === 1 ? "" : "s"} ago. Change the input, or wait up to 10 minutes to run it again.`,
      "duplicate",
      { previousEntryId: twin.id, startedAt: twin.startedAt.toISOString() },
    );
  }

  const [row] = await db()
    .insert(costEntries)
    .values({
      service: input.service,
      action: input.action,
      estimatedUsd: estimated,
      actualUsd: null,
      status: "started",
      fingerprint,
      projectId: input.projectId ?? null,
      stepId: input.stepId ?? null,
      language: input.language ?? null,
      meta: input.meta ?? null,
    })
    .returning({ id: costEntries.id });
  return { entryId: row.id, fingerprint, summary };
}

/**
 * How an actual amount was determined; shown on /dev/costs.
 * - balance: difference of the provider's wallet balance before/after (HeyGen test pages)
 * - tokens: token usage × price per million tokens (Claude)
 * - provider: read back from the provider's usage API (fal.ai sync)
 * - list: list price × measured quantity (what we know when the provider reports nothing)
 */
export type CostBasis = "balance" | "tokens" | "provider" | "list";

/** Records the outcome. `actualUsd` null keeps the estimate as the charge. */
export async function settleSpend(
  entryId: string,
  outcome: { status: "completed" | "failed"; actualUsd?: number | null; basis?: CostBasis; meta?: Record<string, unknown> },
) {
  if (!entryId) return;
  const [current] = await db().select({ meta: costEntries.meta }).from(costEntries).where(eq(costEntries.id, entryId)).limit(1);
  const basis: CostBasis | undefined = outcome.basis ?? (outcome.actualUsd == null ? undefined : "list");
  await db()
    .update(costEntries)
    .set({
      status: outcome.status,
      actualUsd: outcome.actualUsd == null ? null : round4(outcome.actualUsd),
      finishedAt: new Date(),
      meta: { ...(current?.meta ?? {}), ...(outcome.meta ?? {}), ...(basis ? { basis } : {}) },
    })
    .where(eq(costEntries.id, entryId));
}

/** Adds details to an entry without changing its status (e.g. the provider's request id once known). */
export async function annotateSpend(entryId: string, meta: Record<string, unknown>) {
  if (!entryId) return;
  const [current] = await db().select({ meta: costEntries.meta }).from(costEntries).where(eq(costEntries.id, entryId)).limit(1);
  await db().update(costEntries).set({ meta: { ...(current?.meta ?? {}), ...meta } }).where(eq(costEntries.id, entryId));
}

/** Maps a CostGuardError to a JSON response; other errors pass through as null. */
export function costGuardResponse(error: unknown): Response | null {
  if (error instanceof CostGuardError) {
    return Response.json({ error: error.message, code: error.code, details: error.details }, { status: 409 });
  }
  return null;
}
