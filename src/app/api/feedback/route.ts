import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireScope } from "@/lib/auth";
import { db, feedback } from "@/lib/db";
import { dataErrorResponse } from "@/lib/data/server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { notifyAddress, sendEmail } from "@/lib/email";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

export const FEEDBACK_KINDS = ["idea", "problem", "praise"] as const;
const Body = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(2000),
  allowContact: z.boolean().default(true),
});

/** Feedback from a signed-in customer (26 Nov 2026): stored, mailed to NOTIFY_EMAIL, 5 per account per hour. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    if (scope.readOnly) return Response.json({ error: "Feedback cannot be sent while viewing as a customer." }, { status: 403 });
    const limited = await rateLimit(`feedback:user:${scope.user.id}`, 5, 60 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your message." }, { status: 400 });
    const body = parsed.data;

    const [row] = await db().insert(feedback).values({ userId: scope.user.id, workspaceId: scope.workspaceId, kind: body.kind, message: body.message, allowContact: body.allowContact }).returning({ id: feedback.id });
    const to = notifyAddress();
    const mailed = to
      ? await sendEmail({
          to,
          replyTo: body.allowContact ? scope.user.email : undefined,
          subject: `Feedback (${body.kind}) from ${scope.user.email}`,
          text: `${body.kind.toUpperCase()}\n\n${body.message}\n\n— ${scope.user.name ?? scope.user.email}${body.allowContact ? ` (${scope.user.email}, you may reply)` : " (no reply wanted)"}`,
        })
      : { sent: false, reason: "not_configured" as const };
    await db().update(feedback).set({ emailed: mailed.sent ? "sent" : (mailed.reason ?? "failed") }).where(eq(feedback.id, row.id));
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
