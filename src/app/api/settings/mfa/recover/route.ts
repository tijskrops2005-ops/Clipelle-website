import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { recoverWithCode } from "@/lib/mfa";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ code: z.string().trim().min(8).max(40) });

/** A recovery code turns two-step verification off for the signed-in account (lost phone). Five tries per hour. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    const limited = await rateLimit(`mfa:recover:${user.id}`, 5, 60 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "attempts");
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter one of your recovery codes." }, { status: 400 });
    const ok = await recoverWithCode(user.id, parsed.data.code);
    if (!ok) return Response.json({ error: "That recovery code is not right, or it was used before." }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
