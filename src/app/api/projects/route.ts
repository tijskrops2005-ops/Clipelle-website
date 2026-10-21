import { connection } from "next/server";
import { z } from "zod";
import type { LanguageCode } from "@/lib/types";
import type { AdLanguageCode, SpeedKey } from "@/lib/voiceOptions";
import { AdBody, TranslateBody } from "@/lib/data/schemas";
import { createDraft, dataErrorResponse, listProjects } from "@/lib/data/server";
import { requireScope } from "@/lib/auth";
import { databaseModeOnly, readJson } from "./_guard";

/** List all projects (newest first) with signed URLs for their videos. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const scope = await requireScope();
    return Response.json(await listProjects(scope));
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Creates a draft project. Files are uploaded next (signed URLs), then /start runs the workflow. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ workflow?: string }>(request);
  if (!body) return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  try {
    const scope = await requireScope();
    if (body.workflow === "ad") {
      const a = AdBody.parse(body);
      const row = await createDraft(scope, { workflow: "ad", ad: { name: a.name, seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language as AdLanguageCode, accent: a.accent || undefined, voiceId: a.voiceId || undefined, speed: a.speed as SpeedKey, offer: a.offer || undefined, direction: a.direction || undefined, tone: a.tone, backgroundColor: a.backgroundColor, brand: a.brand, reviewScript: a.reviewScript, productName: a.productName, productUrl: a.productUrl || undefined, description: a.description, script: a.script || undefined } });
      return Response.json({ id: row.id, status: row.status }, { status: 201 });
    }
    if (body.workflow === "translate") {
      const t = TranslateBody.parse(body);
      const row = await createDraft(scope, {
        workflow: "translate",
        translate: { ...t, sourceLanguage: t.sourceLanguage as LanguageCode | "auto", targetLanguages: t.targetLanguages as LanguageCode[] },
      });
      return Response.json({ id: row.id, status: row.status }, { status: 201 });
    }
    return Response.json({ error: "workflow must be ad or translate." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid input.", issues: error.issues }, { status: 400 });
    return dataErrorResponse(error);
  }
}
