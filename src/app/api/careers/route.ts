import { z } from "zod";
import { config } from "@/lib/config";
import { careerInterests, db } from "@/lib/db";
import { clientIp, hashIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { notifyAddress, sendEmail } from "@/lib/email";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  link: z.string().trim().max(300).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(4000),
  /** Honeypot. */
  website: z.string().optional().or(z.literal("")),
});

/** Stores an open application. Honeypot, 3 per address per 10 minutes, 2 per e-mail per day. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimit(`careers:ip:${hashIp(ip)}`, 3, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your name, e-mail and message (at least 10 characters)." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return Response.json({ ok: true });
  if (config.demoMode) return Response.json({ ok: true, stored: false });
  const perEmail = await rateLimit(`careers:email:${hashIp(b.email.toLowerCase())}`, 2, 24 * 60 * 60 * 1000);
  if (!perEmail.ok) return Response.json({ error: "We already have your message. We reply by e-mail." }, { status: 429 });
  await db().insert(careerInterests).values({ name: b.name, email: b.email.toLowerCase(), area: b.area || null, link: b.link || null, message: b.message, ipHash: hashIp(ip) });
  const to = notifyAddress();
  if (to) await sendEmail({ to, subject: `Open application from ${b.name}`, text: `${b.name} <${b.email}>${b.area ? ` · ${b.area}` : ""}${b.link ? `\n${b.link}` : ""}\n\n${b.message}` }).catch(() => null);
  return Response.json({ ok: true, stored: true });
}
