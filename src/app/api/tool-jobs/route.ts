import { connection } from "next/server";
import { z } from "zod";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { createToolJob, listToolJobs } from "@/lib/data/enhance";
import { rateLimit } from "@/lib/rateLimit";
import { DataError } from "@/lib/data/errors";
import { isMediaToolKey, MEDIA_TOOL_KEYS } from "@/lib/mediaTools";
import { databaseModeOnly, readJson } from "../projects/_guard";

const Body = z.object({
  tool: z.enum(MEDIA_TOOL_KEYS as [string, ...string[]]),
  stagedPath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(300),
  mime: z.string().max(100).optional(),
  seconds: z.number().positive().max(3600).optional(),
  options: z.object({ preset: z.string().max(40).optional(), position: z.enum(["low", "middle"]).optional(), format: z.enum(["9:16", "original"]).optional(), mode: z.enum(["fill", "fit"]).optional() }).optional(),
  rightsConfirmed: z.literal(true),
});

/** The media tools (25 Nov 2026): your jobs for one tool, newest first. */
export async function GET(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const tool = new URL(request.url).searchParams.get("tool");
  if (!isMediaToolKey(tool)) return Response.json({ error: "Unknown tool." }, { status: 400 });
  try {
    const scope = await requireScope();
    return Response.json({ jobs: await listToolJobs(scope, tool) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Starts a media tool job from a staged upload. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success || !isMediaToolKey(parsed.data.tool)) return Response.json({ error: "Pick a file and confirm you may use it." }, { status: 400 });
  try {
    const scope = await requireScope();
    const limit = await rateLimit(`tools:${scope.userId}`, 30, 60 * 60 * 1000);
    if (!limit.ok) throw new DataError("Too many jobs in a short time. Try again in a little while.", 429, "rate_limited");
    const id = await createToolJob(scope, { ...parsed.data, tool: parsed.data.tool });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
