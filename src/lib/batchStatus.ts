import type { BatchStatus } from "@/lib/types";

/**
 * Batch status from its variants, shared by the server (src/lib/batches.ts) and the screens:
 * processing while any variant runs, completed when all finished, failed when all failed,
 * partial when some finished and some failed.
 */
export function batchStatusOf(statuses: string[]): BatchStatus {
  if (statuses.length === 0) return "processing";
  const done = statuses.filter((s) => s === "completed").length;
  const failed = statuses.filter((s) => s === "failed").length;
  if (done + failed < statuses.length) return "processing";
  if (failed === 0) return "completed";
  if (done === 0) return "failed";
  return "partial";
}
