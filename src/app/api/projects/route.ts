import { connection } from "next/server";
import { z } from "zod";
import { LANGUAGES } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";
import { config } from "@/lib/config";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE, isAdLength, isPresenterEngine } from "@/lib/pricing";
import { AD_TONES, DEFAULT_AD_LANGUAGE, DEFAULT_TONE, DIRECTION_MAX_CHARS, HEX_COLOR, OFFER_MAX_CHARS, CAPTION_STYLES, FONT_KEYS } from "@/lib/adOptions";
import { createDraft, dataErrorResponse, listProjects } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "./_guard";

/** List all projects (newest first) with signed URLs for their videos. */
export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  try {
    return Response.json(await listProjects());
  } catch (error) {
    return dataErrorResponse(error);
  }
}

const codes = LANGUAGES.map((l) => l.code) as [string, ...string[]];

const AdBody = z.object({
  workflow: z.literal("ad"),
  name: z.string().trim().min(2).max(120),
  seconds: z.number().refine(isAdLength, { error: "Choose one of the offered ad lengths." }).default(DEFAULT_AD_SECONDS),
  engine: z.string().refine(isPresenterEngine, { error: "Choose Standard or Premium." }).default(DEFAULT_PRESENTER_ENGINE),
  lookId: z.string().regex(/^[a-f0-9]{32}$/).optional(),
  language: z.enum(codes).default(DEFAULT_AD_LANGUAGE),
  offer: z.string().trim().max(OFFER_MAX_CHARS).optional().or(z.literal("")),
  direction: z.string().trim().max(DIRECTION_MAX_CHARS).optional().or(z.literal("")),
  tone: z.enum(AD_TONES).default(DEFAULT_TONE),
  backgroundColor: z.string().regex(HEX_COLOR).optional(),
  reviewScript: z.boolean().default(false),
  brand: z
    .object({
      accent: z.string().regex(HEX_COLOR).optional(),
      captionStyle: z.enum(CAPTION_STYLES).optional(),
      font: z.enum(FONT_KEYS).optional(),
    })
    .optional(),
  productName: z.string().trim().min(1).max(120),
  productUrl: z.string().trim().url().optional().or(z.literal("")),
  description: z.string().trim().min(20).max(4000),
  script: z.string().trim().max(5000).optional().or(z.literal("")),
});

const TranslateBody = z.object({
  workflow: z.literal("translate"),
  name: z.string().trim().min(2).max(120),
  sourceFileName: z.string().trim().min(1).max(200),
  sourceSeconds: z.number().positive().max(config.limits.translateVideoMaxSeconds),
  sourceLanguage: z.enum(["auto", ...codes]),
  targetLanguages: z.array(z.enum(codes)).min(1).max(codes.length),
  quality: z.enum(["speed", "precision"]),
  reviewBeforeRender: z.boolean(),
  format: z.enum(["original", "9:16"]),
  enhance: z.boolean(),
  rightsConfirmed: z.literal(true, { error: "Confirm the rights to the video first." }),
});

/** Creates a draft project. Files are uploaded next (signed URLs), then /start runs the workflow. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ workflow?: string }>(request);
  if (!body) return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  try {
    if (body.workflow === "ad") {
      const a = AdBody.parse(body);
      const row = await createDraft({ workflow: "ad", ad: { name: a.name, seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language as LanguageCode, offer: a.offer || undefined, direction: a.direction || undefined, tone: a.tone, backgroundColor: a.backgroundColor, brand: a.brand, reviewScript: a.reviewScript, productName: a.productName, productUrl: a.productUrl || undefined, description: a.description, script: a.script || undefined } });
      return Response.json({ id: row.id, status: row.status }, { status: 201 });
    }
    if (body.workflow === "translate") {
      const t = TranslateBody.parse(body);
      const row = await createDraft({
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
