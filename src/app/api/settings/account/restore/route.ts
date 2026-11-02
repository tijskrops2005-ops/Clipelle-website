import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { restoreAccount } from "@/lib/accountLifecycle";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Restore an account within its 30 days (the banner after signing in). API keys stay revoked; the plan runs on if it was not past its period. */
export async function POST() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    await restoreAccount(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
