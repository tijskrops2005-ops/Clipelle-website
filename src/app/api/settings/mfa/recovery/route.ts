import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { assuranceLevel, hasVerifiedTotp, newRecoveryCodes } from "@/lib/mfa";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** New recovery codes (the old ones stop working); only in a session that used the authenticator. */
export async function POST() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!(await hasVerifiedTotp(user.id))) return Response.json({ error: "Turn two-step verification on first." }, { status: 409 });
    const aal = await assuranceLevel();
    if (aal.current !== "aal2") return Response.json({ error: "Verify with your authenticator app first, then make new codes." }, { status: 403 });
    return Response.json({ codes: await newRecoveryCodes(user.id) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
