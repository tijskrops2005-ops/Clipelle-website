import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminError, adminOnly, adminUser } from "@/app/api/admin/_guard";
import { readJson } from "@/app/api/projects/_guard";
import { personalWorkspaceOf } from "@/lib/adminCustomers";
import { recordAudit } from "@/lib/adminAudit";
import { limitCaps, normalizeLimits } from "@/lib/customerLimits";
import { db, profiles, workspaces } from "@/lib/db";

const Body = z.object({ dailyUsd: z.number().min(0).optional(), monthlyUsd: z.number().min(0).optional(), concurrentProjects: z.number().min(0).optional(), reason: z.string().trim().max(300).optional() });

/** Per-customer limits (2 Nov 2026): 0 = the plan's default; never above the caps from the environment; audited. */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    const admin = await adminUser();
    const { id } = await ctx.params;
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Enter whole numbers; 0 means the plan's default." }, { status: 400 });
    const [target] = await db().select({ name: profiles.name, email: profiles.email }).from(profiles).where(eq(profiles.userId, id)).limit(1);
    const ws = await personalWorkspaceOf(id);
    if (!target || !ws) return Response.json({ error: "Customer not found." }, { status: 404 });
    const caps = limitCaps();
    const next = normalizeLimits(parsed.data, caps);
    await db().update(workspaces).set({ limits: next, updatedAt: new Date() }).where(eq(workspaces.id, ws.id));
    await recordAudit({ admin, action: "limits_set", targetUserId: id, targetWorkspaceId: ws.id, targetLabel: target.name ?? target.email, oldValue: ws.limits ?? {}, newValue: next, reason: parsed.data.reason ?? null, request });
    return Response.json({ ok: true, limits: next, caps });
  } catch (error) {
    return adminError(error);
  }
}
