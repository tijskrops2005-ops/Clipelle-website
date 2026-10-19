import { costGuardResponse, CostGuardError, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../_guard";

/**
 * Free self-test of the cost guard on the database: reserves a $0 entry, settles it,
 * then proves the 10-minute duplicate protection by reserving the same input again.
 * Nothing is sent to any provider.
 */
export async function POST() {
  const blocked = devOnly();
  if (blocked) return blocked;
  try {
    const input = { probe: "selftest", at: new Date().toISOString() };
    const first = await reserveSpend({ service: "shotstack", action: "selftest", estimatedUsd: 0, fingerprintInput: input, meta: { selftest: true } });
    await settleSpend(first.entryId, { status: "completed", actualUsd: 0, meta: { settled: true } });
    let duplicate: { refused: boolean; message?: string; code?: string } = { refused: false };
    try {
      await reserveSpend({ service: "shotstack", action: "selftest", estimatedUsd: 0, fingerprintInput: input });
    } catch (error) {
      if (error instanceof CostGuardError) duplicate = { refused: true, message: error.message, code: error.code };
      else throw error;
    }
    // Creative budget: a huge estimate on a fictitious project id must be refused before anything is written.
    let budget: { refused: boolean; message?: string; code?: string } = { refused: false };
    try {
      await reserveSpend({ service: "shotstack", action: "selftest_budget", estimatedUsd: 0.5, fingerprintInput: { ...input, budget: true }, projectId: "00000000-0000-0000-0000-000000000000", language: "de", languageCount: 2 });
      budget = { refused: false };
    } catch (error) {
      if (error instanceof CostGuardError) budget = { refused: error.code === "creative_budget" || error.code === "per_action_limit", message: error.message, code: error.code };
      else throw error;
    }
    return Response.json({ ok: duplicate.refused, entryId: first.entryId, duplicate, budget, note: "budget.refused is true only when MAX_COST_PER_CREATIVE_USD or the per-action limit is below $0.50" });
  } catch (error) {
    return costGuardResponse(error) ?? errorResponse(error);
  }
}
