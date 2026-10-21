import "server-only";
import { and, eq } from "drizzle-orm";
import { db, projectBatches, projects } from "@/lib/db";
import type { BatchStatus } from "@/lib/types";
import { batchStatusOf } from "@/lib/batchStatus";

export { batchStatusOf };

/**
 * Called when a variant finishes or fails (steps.ts): recomputes the batch status. Returns the
 * new status and whether the batch just reached its end, so the caller can notify once.
 */
export async function refreshBatchStatus(batchId: string): Promise<{ status: BatchStatus; justFinished: boolean } | null> {
  const [batch] = await db().select().from(projectBatches).where(eq(projectBatches.id, batchId)).limit(1);
  if (!batch) return null;
  const rows = await db().select({ status: projects.status }).from(projects).where(and(eq(projects.batchId, batchId)));
  const status = batchStatusOf(rows.map((r) => r.status));
  const finished = status !== "processing";
  const justFinished = finished && batch.status === "processing";
  if (status !== batch.status) await db().update(projectBatches).set({ status, updatedAt: new Date() }).where(eq(projectBatches.id, batchId));
  return { status, justFinished };
}
