import { connection } from "next/server";
import { z } from "zod";
import type { AdLanguageCode, SpeedKey } from "@/lib/voiceOptions";
import { BatchBody } from "@/lib/data/schemas";
import { dataErrorResponse } from "@/lib/data/server";
import { createBatch, listBatches } from "@/lib/data/batches";
import { requireScope } from "@/lib/auth";
import { adsEnabledOnly, databaseModeOnly, readJson } from "@/app/api/projects/_guard";

/** The workspace's batches, newest first. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    return Response.json(await listBatches(await requireScope()));
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** "Make variations": creates the batch and one draft project per variant. Files are uploaded to each, then /start. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly() ?? adsEnabledOnly();
  if (blocked) return blocked;
  const body = await readJson<unknown>(request);
  if (!body) return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  try {
    const scope = await requireScope();
    const a = BatchBody.parse(body);
    const { batch, projectIds } = await createBatch(scope, {
      ad: { parentId: a.parentId, name: a.name, seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language as AdLanguageCode, accent: a.accent || undefined, voiceId: a.voiceId || undefined, speed: a.speed as SpeedKey, offer: a.offer || undefined, direction: a.direction || undefined, tone: a.tone, backgroundColor: a.backgroundColor, brand: a.brand, reviewScript: a.reviewScript, productName: a.productName, productUrl: a.productUrl || undefined, description: a.description, script: a.script || undefined },
      variants: a.variants,
    });
    return Response.json({ id: batch.id, projectIds }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid input.", issues: error.issues }, { status: 400 });
    return dataErrorResponse(error);
  }
}
