import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { enableMfaRecord } from "@/lib/mfa";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** The browser verified the new authenticator: record it and return the recovery codes (shown once). */
export async function POST() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    const codes = await enableMfaRecord(user.id);
    return Response.json({ codes });
  } catch (error) {
    return error instanceof Error && !("status" in error) ? Response.json({ error: error.message }, { status: 400 }) : dataErrorResponse(error);
  }
}
