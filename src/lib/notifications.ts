import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db, profiles, projectBatches, projects, steps } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { composeBatchMail, composeProjectMail } from "@/lib/notificationMail";
import { batchStatusOf } from "@/lib/batchStatus";

/**
 * One e-mail per project when it completes or fails, or one per batch instead of one per
 * variation. Sent through src/lib/email.ts (Resend when configured, otherwise logged). The
 * owner's switch in Settings → Profile turns it off; the "notified" stamp makes it run once.
 * Never throws: a mail problem must not fail a finished video.
 */
export async function notifyProjectEnd(projectId: string) {
  try {
    const [row] = await db().select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.notifiedAt))).limit(1);
    if (!row || (row.status !== "completed" && row.status !== "failed") || row.batchId || !row.ownerId) return;
    // Claim first, so two concurrent finishes never send twice.
    const claimed = await db().update(projects).set({ notifiedAt: new Date() }).where(and(eq(projects.id, projectId), isNull(projects.notifiedAt))).returning({ id: projects.id });
    if (claimed.length === 0) return;
    const [owner] = await db().select().from(profiles).where(eq(profiles.userId, row.ownerId)).limit(1);
    if (!owner || !owner.notifyEmail) return;
    const [failedStep] = row.status === "failed" ? await db().select({ error: steps.error }).from(steps).where(and(eq(steps.projectId, projectId), eq(steps.status, "failed"))).limit(1) : [];
    const mail = composeProjectMail({ name: row.name, status: row.status, kind: row.workflow, url: absoluteUrl(`/projects/${row.id}`), error: failedStep?.error ?? undefined, recipientName: owner.name });
    await sendEmail({ to: owner.email, ...mail });
  } catch (error) {
    console.error("[notify] project mail failed", error);
  }
}

export async function notifyBatchEnd(batchId: string) {
  try {
    const claimed = await db().update(projectBatches).set({ notifiedAt: new Date() }).where(and(eq(projectBatches.id, batchId), isNull(projectBatches.notifiedAt))).returning();
    const batch = claimed[0];
    if (!batch) return;
    const members = await db().select({ status: projects.status }).from(projects).where(eq(projects.batchId, batchId));
    const status = batchStatusOf(members.map((m) => m.status));
    if (status === "processing") {
      // Not finished after all (a retry restarted a variation): let the next end claim it.
      await db().update(projectBatches).set({ notifiedAt: null }).where(eq(projectBatches.id, batchId));
      return;
    }
    const [owner] = await db().select().from(profiles).where(eq(profiles.userId, batch.ownerId)).limit(1);
    if (!owner || !owner.notifyEmail) return;
    const finished = members.filter((m) => m.status === "completed").length;
    const failed = members.filter((m) => m.status === "failed").length;
    const mail = composeBatchMail({ name: batch.name, status, finished, failed, total: members.length, url: absoluteUrl(`/batches/${batchId}`), recipientName: owner.name });
    await sendEmail({ to: owner.email, ...mail });
  } catch (error) {
    console.error("[notify] batch mail failed", error);
  }
}
