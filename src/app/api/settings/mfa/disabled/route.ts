import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { dataErrorResponse } from "@/lib/data/server";
import { disableMfaRecord, hasVerifiedTotp } from "@/lib/mfa";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** The browser removed the authenticator (after a code check): clear the mirror and the recovery codes. */
export async function POST() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (await hasVerifiedTotp(user.id)) return Response.json({ error: "The authenticator is still active. Enter the code to remove it first." }, { status: 409 });
    await disableMfaRecord(user.id);
    return Response.json({ ok: true, adminLocked: isAdmin(user.email) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
