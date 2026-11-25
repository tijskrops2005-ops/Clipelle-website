import { connection } from "next/server";
import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { createEnhanceJob, enhanceLimits, listEnhanceJobs } from "@/lib/data/enhance";
import { rateLimit } from "@/lib/rateLimit";
import { DataError } from "@/lib/data/errors";
import { databaseModeOnly, readJson } from "../projects/_guard";

const Body = z.object({
  kind: z.enum(["video", "image"]),
  target: z.enum(["1080p", "4k", "2x", "4x"]),
  stagedPath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  mime: z.string().max(100).optional(),
  seconds: z.number().positive().max(3600).optional(),
  rightsConfirmed: z.literal(true),
});

/** The enhancer: your jobs (newest first) and how long a video may be per size. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    return Response.json({ jobs: await listEnhanceJobs(scope), limits: enhanceLimits() });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Starts an enhancement from a staged upload. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Pick a file, a size, and confirm you may use the file." }, { status: 400 });
  try {
    const scope = await requireScope();
    const limit = await rateLimit(`enhance:${scope.userId}`, 30, 60 * 60 * 1000);
    if (!limit.ok) throw new DataError("Too many enhancements in a short time. Try again in a little while.", 429, "rate_limited");
    const id = await createEnhanceJob(scope, parsed.data);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
