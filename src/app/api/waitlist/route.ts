import { z } from "zod";
import { config } from "@/lib/config";
import { db, waitlist } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { clientIp, hashIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { WAITLIST_FEATURES } from "@/lib/waitlistFeatures";

const Body = z.object({
  feature: z.enum(WAITLIST_FEATURES),
  email: z.string().trim().email().max(200),
  /** Honeypot: people never see it. */
  website: z.string().optional().or(z.literal("")),
});

/** Stores one wish per e-mail per feature. 5 per address per 10 minutes. Nothing else happens. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimit(`waitlist:ip:${hashIp(ip)}`, 5, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  if (parsed.data.website) return Response.json({ ok: true });
  if (config.demoMode) return Response.json({ ok: true, stored: false });
  const user = await getUser();
  await db()
    .insert(waitlist)
    .values({ feature: parsed.data.feature, email: parsed.data.email.toLowerCase(), userId: user?.id ?? null, ipHash: hashIp(ip) })
    .onConflictDoNothing();
  return Response.json({ ok: true, stored: true });
}
