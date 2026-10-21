import { z } from "zod";
import { config } from "@/lib/config";
import { db, serviceRequests } from "@/lib/db";
import { clientIp, hashIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { notifyAddress, sendEmail } from "@/lib/email";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  sells: z.string().trim().max(300).optional().or(z.literal("")),
  adsPerMonth: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  /** Honeypot. */
  website: z.string().optional().or(z.literal("")),
});

/** Stores a managed-service request. Honeypot, 5 per address per 10 minutes, 3 per e-mail per day. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimit(`service:ip:${hashIp(ip)}`, 5, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your name and e-mail." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return Response.json({ ok: true });
  if (config.demoMode) return Response.json({ ok: true, stored: false });
  const perEmail = await rateLimit(`service:email:${hashIp(b.email.toLowerCase())}`, 3, 24 * 60 * 60 * 1000);
  if (!perEmail.ok) return Response.json({ error: "We already have your request. We reply by e-mail within two working days." }, { status: 429 });
  await db().insert(serviceRequests).values({ name: b.name, email: b.email.toLowerCase(), company: b.company || null, sells: b.sells || null, adsPerMonth: b.adsPerMonth || null, message: b.message || null, ipHash: hashIp(ip) });
  const to = notifyAddress();
  if (to) await sendEmail({ to, subject: `Managed service request from ${b.name}`, text: `${b.name} <${b.email}>${b.company ? ` (${b.company})` : ""}\nSells: ${b.sells || "-"}\nAds per month: ${b.adsPerMonth || "-"}\n\n${b.message || ""}` }).catch(() => null);
  return Response.json({ ok: true, stored: true });
}
