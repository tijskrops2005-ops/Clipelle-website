import { z } from "zod";
import { adminError, adminOnly, adminUser } from "@/app/api/admin/_guard";
import { readJson } from "@/app/api/projects/_guard";
import { personalWorkspaceOf } from "@/lib/adminCustomers";
import { recordAudit } from "@/lib/adminAudit";
import { getCreditBalance, grantCredits } from "@/lib/credits";
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";

const Body = z.object({ credits: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0, { error: "Enter a number other than 0." }), reason: z.string().trim().min(3, { error: "Give a reason of at least three characters." }).max(300), allowNegative: z.boolean().optional(), token: z.string().uuid() });

/**
 * Adjust a customer's credits by hand (2 Nov 2026): a positive or negative number with a reason,
 * booked in the ledger as grant_manual (the reason is the note) and written to the audit log. A
 * result below zero needs `allowNegative`. The token makes a double click harmless.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    const admin = await adminUser();
    const { id } = await ctx.params;
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the numbers." }, { status: 400 });
    const [target] = await db().select({ name: profiles.name, email: profiles.email }).from(profiles).where(eq(profiles.userId, id)).limit(1);
    const ws = await personalWorkspaceOf(id);
    if (!target || !ws) return Response.json({ error: "Customer not found." }, { status: 404 });
    const before = await getCreditBalance(ws.id);
    const after = before + parsed.data.credits;
    if (after < 0 && !parsed.data.allowNegative) return Response.json({ error: `This leaves the balance at ${after}. Confirm that you want a negative balance.`, code: "negative", before, after }, { status: 409 });
    await grantCredits({ workspaceId: ws.id, userId: id, credits: parsed.data.credits, kind: "grant_manual", note: parsed.data.reason, expiresAt: null, reference: `admin:${parsed.data.token}` });
    const balance = await getCreditBalance(ws.id);
    await recordAudit({ admin, action: "credits_adjust", targetUserId: id, targetWorkspaceId: ws.id, targetLabel: target.name ?? target.email, oldValue: { balance: before }, newValue: { balance, credits: parsed.data.credits }, reason: parsed.data.reason, request });
    return Response.json({ ok: true, before, balance });
  } catch (error) {
    return adminError(error);
  }
}
