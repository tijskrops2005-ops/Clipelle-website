import { connection } from "next/server";
import { ensureBucket, getStorageUsage } from "@/lib/storage";
import { devOnly, errorResponse } from "../_guard";

/** Free: creates the bucket if needed and reports how much of the free 1 GB is used. */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  try {
    await ensureBucket();
    return Response.json(await getStorageUsage());
  } catch (error) {
    return errorResponse(error);
  }
}
