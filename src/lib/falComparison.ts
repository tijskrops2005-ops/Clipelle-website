import "server-only";
import { gte } from "drizzle-orm";
import { costEntries, db } from "@/lib/db";
import { chargeOf } from "@/lib/services/costGuard";
import { getFalUsage } from "@/lib/services/falUsage";

/**
 * What we recorded for fal.ai (list prices) next to what fal.ai says it billed, per model endpoint,
 * for today or this week. fal's usage API is aggregated per endpoint, so this confirms totals, not
 * single calls. Shared by /dev/costs and /admin/costs (29 Oct 2026).
 */
export async function falComparison(period: "today" | "week") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date();
  const [usage, ours] = await Promise.all([getFalUsage({ start, end }), db().select().from(costEntries).where(gte(costEntries.startedAt, start))]);
  const ourByEndpoint = new Map<string, number>();
  for (const e of ours) {
    if (e.service !== "fal") continue;
    const m = (e.meta ?? {}) as Record<string, unknown>;
    const endpoint = (m.endpointId as string | undefined) ?? (e.action === "expand_image" || e.action === "expand" ? "fal-ai/bria/expand" : e.action === "enhance_video" ? "fal-ai/topaz/upscale/video" : e.action);
    ourByEndpoint.set(endpoint, (ourByEndpoint.get(endpoint) ?? 0) + chargeOf(e));
  }
  const endpoints = new Set([...ourByEndpoint.keys(), ...usage.map((u) => u.endpoint_id)]);
  const rows = [...endpoints].map((endpoint) => {
    const fal = usage.filter((u) => u.endpoint_id === endpoint);
    const billed = fal.reduce((n, u) => n + u.cost_total, 0);
    const recorded = ourByEndpoint.get(endpoint) ?? 0;
    return { endpoint, recordedUsd: Math.round(recorded * 100) / 100, billedUsd: Math.round(billed * 100) / 100, unit: fal[0]?.unit ?? null, quantity: fal.reduce((n, u) => n + u.quantity, 0), diffUsd: Math.round((billed - recorded) * 100) / 100 };
  });
  return { period, start: start.toISOString(), end: end.toISOString(), rows };
}
