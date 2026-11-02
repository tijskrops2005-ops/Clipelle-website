import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { mfaState } from "@/lib/mfa";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Two-step verification state for Settings → Profile (2 Nov 2026): on/off, recovery codes left, required for admins. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await getOrCreateProfile(user);
    const state = await mfaState(user.id);
    return Response.json({ ...state, required: isAdmin(user.email) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
