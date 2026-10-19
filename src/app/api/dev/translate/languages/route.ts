import { connection } from "next/server";
import { listTranslationLanguages, matchLanguages } from "@/lib/services/translate";
import { balanceOf, getAccount } from "@/lib/services/heygen";
import { devOnly, errorResponse } from "../_guard";

/** Free: the live language list matched to our five languages, plus the account balance. */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection(); // live data: never prerender
  try {
    const [languages, account] = await Promise.all([listTranslationLanguages(), getAccount()]);
    return Response.json({
      total: languages.length,
      matched: matchLanguages(languages),
      sample: languages.slice(0, 12),
      account: { billingType: account.billing_type ?? null, balance: balanceOf(account) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
