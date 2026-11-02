import { adminCancelProject, adminRetryProject } from "@/lib/admin";
import { adminError, adminOnly, adminUser } from "@/app/api/admin/_guard";
import { readJson } from "@/app/api/projects/_guard";
import { recordAudit } from "@/lib/adminAudit";
import { db, projects } from "@/lib/db";
import { eq } from "drizzle-orm";

/** Admin only (with two-step verification): Retry or Cancel a stuck project; both go to the audit log (2 Nov 2026). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    const admin = await adminUser();
    const { id } = await ctx.params;
    const body = await readJson<{ action?: string }>(request);
    const result = body?.action === "retry" ? await adminRetryProject(id) : body?.action === "cancel" ? await adminCancelProject(id) : { ok: false as const, error: "action must be retry or cancel." };
    if (result.ok) {
      const [p] = await db().select({ ownerId: projects.ownerId, workspaceId: projects.workspaceId, name: projects.name }).from(projects).where(eq(projects.id, id)).limit(1);
      await recordAudit({ admin, action: body?.action === "retry" ? "project_retry" : "project_cancel", targetUserId: p?.ownerId ?? null, targetWorkspaceId: p?.workspaceId ?? null, targetLabel: p?.name ?? id, newValue: { projectId: id }, request });
    }
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return adminError(error);
  }
}
