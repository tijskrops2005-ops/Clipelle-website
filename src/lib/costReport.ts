import "server-only";
import { desc, inArray } from "drizzle-orm";
import { costEntries, db, projects, steps, type CostEntryRow, type ProjectRow, type StepRow, type TranslateInput } from "@/lib/db";
import { chargeOf, costLimits, type CostBasis, type CostService } from "@/lib/services/costGuard";

/**
 * Builds the cost overview for /dev/costs from the cost_entries table (no extra columns):
 * one run per project (plus "Test pages" for calls made from /dev/* without a project),
 * every paid call with a readable model/setting label and how its actual amount was determined.
 */

export const SERVICE_INFO: Record<CostService, { label: string; dashboard: string; actualsVia: string }> = {
  heygen: { label: "HeyGen", dashboard: "https://app.heygen.com/", actualsVia: "wallet balance before/after on the test pages; list price in the orchestrator" },
  anthropic: { label: "Claude", dashboard: "https://platform.claude.com/", actualsVia: "token usage × price per million tokens" },
  fal: { label: "fal.ai", dashboard: "https://fal.ai/dashboard/usage", actualsVia: "list price × quantity; totals per model can be checked with the fal.ai usage API (button below)" },
  shotstack: { label: "Shotstack", dashboard: "https://dashboard.shotstack.io/", actualsVia: "list price ($0.10 per 30 s); no usage API" },
};

export type ReportEntry = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  service: CostService;
  action: string;
  step: string | null;
  language: string | null;
  /** Model and setting, e.g. "Avatar IV · 1080p · 13 s". */
  setting: string;
  estimatedUsd: number;
  actualUsd: number | null;
  /** What this entry counts for (actual when known, else estimate; failed = actual or 0). */
  chargedUsd: number;
  status: "started" | "completed" | "failed";
  basis: CostBasis | "pending" | "not charged";
  basisLabel: string;
  isRetry: boolean;
  attempt: number | null;
  dashboard: string;
};

export type ReportRun = {
  key: string;
  projectId: string | null;
  name: string;
  workflow: "ad" | "translate" | "test";
  projectStatus: string;
  createdAt: string;
  languages: number;
  budgetUsd: number;
  budgetLabel: string;
  estimatedUsd: number;
  actualUsd: number;
  chargedUsd: number;
  entries: ReportEntry[];
  byLanguage: { language: string; chargedUsd: number }[];
};

export type CostReport = {
  generatedAt: string;
  limits: { maxPerActionUsd: number; maxPerCreativeUsd: number };
  totals: {
    todayUsd: number;
    weekUsd: number;
    allTimeUsd: number;
    byService: { service: CostService; label: string; todayUsd: number; weekUsd: number; allTimeUsd: number; listOnlyUsd: number; dashboard: string; actualsVia: string }[];
  };
  runs: ReportRun[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 local time. */
function startOfWeek() {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function describe(e: CostEntryRow): string {
  const m = (e.meta ?? {}) as Record<string, unknown>;
  const s = (k: string) => (m[k] === undefined || m[k] === null ? undefined : String(m[k]));
  const secs = (k: string) => (typeof m[k] === "number" ? `${Math.round(m[k] as number)} s` : undefined);
  const parts: (string | undefined)[] = [];
  if (e.action.startsWith("selftest")) return "Cost guard self-test (no provider call)";
  switch (e.service) {
    case "heygen":
      if (e.action === "avatar_video") parts.push(s("engine")?.replace("avatar_iv", "Avatar IV").replace("avatar_iii", "Avatar III") ?? "Avatar", s("resolution"), secs("durationSeconds") ?? secs("seconds"));
      else if (e.action.startsWith("translate_proofread")) parts.push("Proofread", s("mode"), s("output") ? `${s("output")}` : undefined, secs("seconds"));
      else if (e.action.startsWith("translate_generate")) parts.push("Translation render", s("mode"), s("language")?.toUpperCase(), secs("seconds"));
      else parts.push(e.action);
      break;
    case "anthropic": {
      const usage = m.usage as { inputTokens?: number; outputTokens?: number } | undefined;
      parts.push(s("model") ?? (e.action === "ad_script" || e.action === "script" ? "claude-opus-5-5" : "claude-sonnet-5-5"), e.action.replace("_", " "));
      if (usage?.inputTokens !== undefined) parts.push(`${usage.inputTokens} in / ${usage.outputTokens ?? 0} out tokens`);
      break;
    }
    case "fal":
      if (e.action.startsWith("clip_")) parts.push(s("model") ?? e.action.replace("clip_", ""), secs("seconds") ?? "5 s");
      else if (e.action === "expand_image" || e.action === "expand") parts.push("Bria Expand", "1 image");
      else if (e.action === "enhance_video") parts.push("Topaz Proteus", "≤1080p");
      else parts.push(e.action);
      break;
    case "shotstack":
      parts.push("Render", s("env") === "v1" ? "production" : "sandbox (counted as production)", secs("seconds") ?? secs("totalSeconds"));
      break;
  }
  return parts.filter(Boolean).join(" · ");
}

function basisOf(e: CostEntryRow): { basis: ReportEntry["basis"]; label: string } {
  const m = (e.meta ?? {}) as Record<string, unknown>;
  if (e.status === "started") return { basis: "pending", label: "still running: estimate counts" };
  if (e.status === "failed" && !(e.actualUsd && e.actualUsd > 0)) return { basis: "not charged", label: "failed before anything was charged" };
  const b = m.basis as CostBasis | undefined;
  if (b === "balance") return { basis: "balance", label: "wallet balance before/after" };
  if (b === "tokens") return { basis: "tokens", label: "token usage × price" };
  if (b === "provider") return { basis: "provider", label: "read from the provider's usage API" };
  if (e.actualUsd == null) return { basis: "list", label: "estimate (list price); not yet settled" };
  return { basis: "list", label: "list price × measured quantity (check the dashboard)" };
}

export async function buildCostReport(limitEntries = 2000): Promise<CostReport> {
  const d = db();
  const entries = await d.select().from(costEntries).orderBy(desc(costEntries.startedAt)).limit(limitEntries);
  const projectIds = [...new Set(entries.map((e) => e.projectId).filter((x): x is string => Boolean(x)))];
  const stepIds = [...new Set(entries.map((e) => e.stepId).filter((x): x is string => Boolean(x)))];
  const [projectRows, stepRows] = await Promise.all([
    projectIds.length ? d.select().from(projects).where(inArray(projects.id, projectIds)) : Promise.resolve([] as ProjectRow[]),
    stepIds.length ? d.select().from(steps).where(inArray(steps.id, stepIds)) : Promise.resolve([] as StepRow[]),
  ]);
  const projectById = new Map(projectRows.map((p) => [p.id, p]));
  const stepById = new Map(stepRows.map((s) => [s.id, s]));
  const limits = costLimits();

  const toEntry = (e: CostEntryRow): ReportEntry => {
    const step = e.stepId ? stepById.get(e.stepId) : undefined;
    const m = (e.meta ?? {}) as Record<string, unknown>;
    const attempt = typeof m.attempt === "number" ? (m.attempt as number) : step?.attempt ?? null;
    const b = basisOf(e);
    return {
      id: e.id,
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt?.toISOString() ?? null,
      service: e.service,
      action: e.action,
      step: step?.key ?? null,
      language: e.language,
      setting: describe(e),
      estimatedUsd: e.estimatedUsd,
      actualUsd: e.actualUsd,
      chargedUsd: round2(chargeOf(e)),
      status: e.status,
      basis: b.basis,
      basisLabel: b.label,
      isRetry: (attempt ?? 1) > 1,
      attempt,
      dashboard: SERVICE_INFO[e.service].dashboard,
    };
  };

  // Group by project; entries without a project come from the /dev test pages.
  const groups = new Map<string, CostEntryRow[]>();
  for (const e of entries) {
    const k = e.projectId ?? "test";
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const runs: ReportRun[] = [...groups.entries()].map(([key, rows]) => {
    const p = key === "test" ? undefined : projectById.get(key);
    const languages = p?.workflow === "translate" ? (p.input as TranslateInput).targetLanguages.length : 1;
    const list = rows.map(toEntry);
    const byLang = new Map<string, number>();
    for (const e of list) if (e.language) byLang.set(e.language, (byLang.get(e.language) ?? 0) + e.chargedUsd);
    return {
      key,
      projectId: p?.id ?? null,
      name: p?.name ?? (key === "test" ? "Test pages (no project)" : "Deleted project"),
      workflow: p?.workflow ?? "test",
      projectStatus: p?.status ?? "–",
      createdAt: (p?.createdAt ?? rows[rows.length - 1].startedAt).toISOString(),
      languages,
      budgetUsd: limits.maxPerCreativeUsd,
      budgetLabel: p?.workflow === "translate" ? `$${limits.maxPerCreativeUsd.toFixed(2)} per language × ${languages}` : key === "test" ? "no budget (test pages)" : `$${limits.maxPerCreativeUsd.toFixed(2)} per video`,
      estimatedUsd: round2(list.reduce((n, e) => n + e.estimatedUsd, 0)),
      actualUsd: round2(list.reduce((n, e) => n + (e.actualUsd ?? 0), 0)),
      chargedUsd: round2(list.reduce((n, e) => n + e.chargedUsd, 0)),
      entries: list,
      byLanguage: [...byLang.entries()].map(([language, chargedUsd]) => ({ language, chargedUsd: round2(chargedUsd) })),
    };
  });
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const today = startOfToday().getTime();
  const week = startOfWeek().getTime();
  const sum = (rows: CostEntryRow[]) => round2(rows.reduce((n, e) => n + chargeOf(e), 0));
  const byService = (Object.keys(SERVICE_INFO) as CostService[]).map((service) => {
    const rows = entries.filter((e) => e.service === service);
    const listOnly = rows.filter((e) => e.status === "completed" && ((e.meta as Record<string, unknown> | null)?.basis ?? "list") === "list");
    return {
      service,
      label: SERVICE_INFO[service].label,
      todayUsd: sum(rows.filter((e) => e.startedAt.getTime() >= today)),
      weekUsd: sum(rows.filter((e) => e.startedAt.getTime() >= week)),
      allTimeUsd: sum(rows),
      listOnlyUsd: sum(listOnly),
      dashboard: SERVICE_INFO[service].dashboard,
      actualsVia: SERVICE_INFO[service].actualsVia,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    limits,
    totals: {
      todayUsd: sum(entries.filter((e) => e.startedAt.getTime() >= today)),
      weekUsd: sum(entries.filter((e) => e.startedAt.getTime() >= week)),
      allTimeUsd: sum(entries),
      byService,
    },
    runs,
  };
}

/** Flat CSV of every paid call, newest first. */
export function reportToCsv(report: CostReport) {
  const header = ["started_at", "finished_at", "run", "workflow", "project_id", "step", "language", "service", "action", "setting", "estimated_usd", "actual_usd", "charged_usd", "status", "basis", "retry", "attempt"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const run of report.runs) {
    for (const e of run.entries) {
      lines.push([e.startedAt, e.finishedAt, run.name, run.workflow, run.projectId, e.step, e.language, e.service, e.action, e.setting, e.estimatedUsd, e.actualUsd, e.chargedUsd, e.status, e.basis, e.isRetry ? "yes" : "no", e.attempt].map(esc).join(","));
    }
  }
  return lines.join("\n") + "\n";
}
