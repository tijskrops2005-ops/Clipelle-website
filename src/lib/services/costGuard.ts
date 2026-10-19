/**
 * Central cost guard for every paid API call (HeyGen, Claude, fal.ai, Shotstack production).
 * Server-only by usage: imported from route handlers and services, never from client code.
 *
 * - Per-action and per-day limits from .env.local (MAX_COST_PER_ACTION_USD, MAX_DAILY_SPEND_USD).
 * - Append-only JSON-lines log (development: a file under .reelay/; Stage 8: the database).
 * - Duplicate protection: the same request fingerprint within 10 minutes is not run again.
 *
 * Usage: `const { entryId } = await reserveSpend(...)` BEFORE the paid call; it throws CostGuardError
 * when a limit or duplicate blocks it. Then `await settleSpend(entryId, { status, actualUsd })`.
 */
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

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
  meta?: Record<string, unknown>;
};

type LogLine =
  | { kind: "start"; entry: CostEntry }
  | { kind: "settle"; id: string; status: Exclude<EntryStatus, "started">; actualUsd: number | null; finishedAt: string; meta?: Record<string, unknown> };

export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export type CostGuardCode = "per_action_limit" | "daily_limit" | "duplicate";

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
    maxPerActionUsd: envNumber("MAX_COST_PER_ACTION_USD", 1.0),
    maxDailyUsd: envNumber("MAX_DAILY_SPEND_USD", 5.0),
  };
}

function logPath() {
  return process.env.COST_LOG_PATH?.trim() || path.join(process.cwd(), ".reelay", "cost-log.jsonl");
}

/* ---------- storage (append-only JSON lines) ---------- */

async function readLines(): Promise<LogLine[]> {
  try {
    const raw = await readFile(logPath(), "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as LogLine;
        } catch {
          return null;
        }
      })
      .filter((l): l is LogLine => l !== null);
  } catch {
    return [];
  }
}

async function appendLine(line: LogLine) {
  const file = logPath();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(line) + "\n", "utf8");
}

/** Folds the log into the current state of every entry, newest first. */
export async function listEntries(): Promise<CostEntry[]> {
  const entries = new Map<string, CostEntry>();
  for (const line of await readLines()) {
    if (line.kind === "start") {
      entries.set(line.entry.id, { ...line.entry });
    } else {
      const e = entries.get(line.id);
      if (e) {
        e.status = line.status;
        e.actualUsd = line.actualUsd;
        e.finishedAt = line.finishedAt;
        if (line.meta) e.meta = { ...e.meta, ...line.meta };
      }
    }
  }
  return [...entries.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/* ---------- helpers ---------- */

/** Local calendar day (the server's timezone), e.g. "2026-10-19". */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(iso: string) {
  return todayKey(new Date(iso)) === todayKey();
}

/** What an entry counts for: the real cost when known, otherwise the estimate (reserved). Failed = what it actually cost (usually 0). */
function chargeOf(e: CostEntry) {
  if (e.status === "failed") return e.actualUsd ?? 0;
  return e.actualUsd ?? e.estimatedUsd;
}

/** Stable fingerprint of a request's meaningful inputs. */
export function fingerprintOf(service: CostService, action: string, input: unknown) {
  const canonical = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash("sha256").update(`${service}:${action}:${canonical}`).digest("hex");
}

export const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/* ---------- public API ---------- */

export type SpendSummary = {
  day: string;
  spentTodayUsd: number;
  remainingTodayUsd: number;
  maxDailyUsd: number;
  maxPerActionUsd: number;
  actionsToday: number;
  recent: CostEntry[];
};

export async function getSpendSummary(recentLimit = 10): Promise<SpendSummary> {
  const limits = costLimits();
  const entries = await listEntries();
  const today = entries.filter((e) => isToday(e.startedAt));
  const spent = round4(today.reduce((sum, e) => sum + chargeOf(e), 0));
  return {
    day: todayKey(),
    spentTodayUsd: spent,
    remainingTodayUsd: round4(Math.max(0, limits.maxDailyUsd - spent)),
    maxDailyUsd: limits.maxDailyUsd,
    maxPerActionUsd: limits.maxPerActionUsd,
    actionsToday: today.length,
    recent: entries.slice(0, recentLimit),
  };
}

export type ReserveInput = {
  service: CostService;
  action: string;
  estimatedUsd: number;
  /** The request inputs that make two calls "the same". */
  fingerprintInput: unknown;
  meta?: Record<string, unknown>;
};

/**
 * Checks the limits and the duplicate window, then records the action as started.
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
  if (summary.spentTodayUsd + estimated > limits.maxDailyUsd) {
    throw new CostGuardError(
      `Today's spend is $${summary.spentTodayUsd.toFixed(2)} of the $${limits.maxDailyUsd.toFixed(2)} daily limit; this $${estimated.toFixed(2)} action would exceed it. Try again tomorrow or raise MAX_DAILY_SPEND_USD in .env.local.`,
      "daily_limit",
      { spentTodayUsd: summary.spentTodayUsd, estimatedUsd: estimated, maxDailyUsd: limits.maxDailyUsd },
    );
  }

  const fingerprint = fingerprintOf(input.service, input.action, input.fingerprintInput);
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  const entries = await listEntries();
  const twin = entries.find(
    (e) => e.fingerprint === fingerprint && e.status !== "failed" && Date.parse(e.startedAt) >= cutoff,
  );
  if (twin) {
    const minutes = Math.max(1, Math.round((Date.now() - Date.parse(twin.startedAt)) / 60_000));
    throw new CostGuardError(
      `The same request was already ${twin.status === "started" ? "started" : "completed"} ${minutes} minute${minutes === 1 ? "" : "s"} ago. Change the input, or wait up to 10 minutes to run it again.`,
      "duplicate",
      { previousEntryId: twin.id, startedAt: twin.startedAt },
    );
  }

  const entry: CostEntry = {
    id: crypto.randomUUID(),
    service: input.service,
    action: input.action,
    estimatedUsd: estimated,
    actualUsd: null,
    status: "started",
    fingerprint,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    meta: input.meta,
  };
  await appendLine({ kind: "start", entry });
  return { entryId: entry.id, fingerprint, summary };
}

/** Records the outcome. `actualUsd` null keeps the estimate as the charge. */
export async function settleSpend(
  entryId: string,
  outcome: { status: "completed" | "failed"; actualUsd?: number | null; meta?: Record<string, unknown> },
) {
  if (!entryId) return;
  await appendLine({
    kind: "settle",
    id: entryId,
    status: outcome.status,
    actualUsd: outcome.actualUsd == null ? null : round4(outcome.actualUsd),
    finishedAt: new Date().toISOString(),
    meta: outcome.meta,
  });
}

/** Maps a CostGuardError to a JSON response; other errors pass through as null. */
export function costGuardResponse(error: unknown): Response | null {
  if (error instanceof CostGuardError) {
    return Response.json({ error: error.message, code: error.code, details: error.details }, { status: 409 });
  }
  return null;
}
