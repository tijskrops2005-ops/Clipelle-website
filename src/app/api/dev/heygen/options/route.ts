import { connection } from "next/server";
import { balanceOf, getAccount, listLookSelection, listVoices } from "@/lib/services/heygen";
import { devOnly, errorResponse } from "../_guard";

export async function GET() {
  await connection(); // never prerender or cache: live data from HeyGen
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    const [looks, voices, account] = await Promise.all([
      listLookSelection(),
      listVoices({ language: "English", limit: 100 }),
      getAccount(),
    ]);
    return Response.json({
      looks,
      voices,
      account: { billingType: account.billing_type ?? null, balance: balanceOf(account) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
