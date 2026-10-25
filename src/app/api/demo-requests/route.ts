import { z } from "zod";
import { and, count, eq, gte } from "drizzle-orm";
import { db, demoRequests } from "@/lib/db";
import { config } from "@/lib/config";
import { clientIp, hashIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { notifyAddress, sendEmail } from "@/lib/email";

const Body = z.object({
  kind: z.enum(["demo", "contact"]).default("demo"),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  goal: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  /** Honeypot: people never see it; anything in it is a bot. */
  website: z.string().optional().or(z.literal("")),
});

/** Stores a demo or contact request. Honeypot, 5 per address per 10 minutes, 3 per e-mail per day. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimit(`demo:ip:${hashIp(ip)}`, 5, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Check your name, e-mail and message." }, { status: 400 });
  const body = parsed.data;
  if (body.website) return Response.json({ ok: true }); // bot: say yes, store nothing

  if (config.demoMode) {
    // Demo mode has no database routes: accept and do nothing, so the public site still works.
    return Response.json({ ok: true, stored: false });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db().select({ n: count() }).from(demoRequests).where(and(eq(demoRequests.email, body.email.toLowerCase()), gte(demoRequests.createdAt, since)));
  if (n >= 3) return Response.json({ error: "We already have your request. We reply by e-mail within two working days." }, { status: 429 });

  const [row] = await db()
    .insert(demoRequests)
    .values({ kind: body.kind, name: body.name, email: body.email.toLowerCase(), company: body.company || null, goal: body.goal || null, message: body.message || null, ipHash: hashIp(ip), userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null })
    .returning();

  const to = notifyAddress();
  const mailed = to ? await sendEmail({ to, replyTo: body.email, subject: `${body.kind === "demo" ? "Demo request" : "Contact"} from ${body.name}`, text: `${body.name} <${body.email}>${body.company ? ` (${body.company})` : ""}\n\n${body.goal ? `Goal: ${body.goal}\n\n` : ""}${body.message ?? ""}` }) : { sent: false, reason: "not_configured" as const };
  await db().update(demoRequests).set({ emailed: mailed.sent ? "sent" : mailed.reason ?? "failed" }).where(eq(demoRequests.id, row.id));
  return Response.json({ ok: true, stored: true });
}
