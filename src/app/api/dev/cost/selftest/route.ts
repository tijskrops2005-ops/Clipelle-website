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
    return Response.json({ ok: duplicate.refused, entryId: first.entryId, duplicate });
  } catch (error) {
    return costGuardResponse(error) ?? errorResponse(error);
  }
}
