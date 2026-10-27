import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, profiles, projectBatches, projects, steps, translations } from "@/lib/db";
import { sendEmail, type InlineImage } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { composeBatchMail, composeProjectMail, type MailDownload } from "@/lib/notificationMail";
import { makeMailPoster } from "@/lib/mailPoster";
import { languageOf } from "@/lib/languages";
import { batchStatusOf } from "@/lib/batchStatus";

/**
 * One e-mail per project when it completes or fails, or one per batch instead of one per
 * variation. Sent through src/lib/email.ts (Resend when configured, otherwise logged). The
 * owner's switch in Settings → Profile turns it off; the "notified" stamp makes it run once.
 * Never throws: a mail problem must not fail a finished video.
 */
function mailLinks() {
  return { logoUrl: absoluteUrl("/brand/clipelle-logo-dark-600.png"), settingsUrl: absoluteUrl("/settings") };
}

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
    const url = absoluteUrl(`/projects/${row.id}`);
    let downloads: MailDownload[] = [];
    const inline: InlineImage[] = [];
    let poster: { cid: string; width: number; height: number } | null = null;
    if (row.status === "completed") {
      // The project page starts the download itself (?download=), after a sign-in when needed.
      if (row.workflow === "ad") downloads = [{ label: "Video", url: `${url}?download=1` }];
      else {
        const done = await db().select({ language: translations.language }).from(translations).where(and(eq(translations.projectId, projectId), eq(translations.status, "completed"))).orderBy(asc(translations.createdAt));
        downloads = done.map((t) => ({ label: languageOf(t.language).label, url: `${url}?download=${encodeURIComponent(t.language)}` }));
      }
      const picture = await makeMailPoster(projectId);
      if (picture) {
        poster = { cid: "poster", width: picture.width, height: picture.height };
        inline.push({ contentId: "poster", filename: "video.jpg", contentType: "image/jpeg", data: picture.jpeg });
      }
    }
    const mail = composeProjectMail({ name: row.name, status: row.status, kind: row.workflow, url, error: failedStep?.error ?? undefined, recipientName: owner.name, downloads, poster, links: mailLinks() });
    await sendEmail({ to: owner.email, ...mail, inline });
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
    const mail = composeBatchMail({ name: batch.name, status, finished, failed, total: members.length, url: absoluteUrl(`/batches/${batchId}`), recipientName: owner.name, links: mailLinks() });
    await sendEmail({ to: owner.email, ...mail });
  } catch (error) {
    console.error("[notify] batch mail failed", error);
  }
}
