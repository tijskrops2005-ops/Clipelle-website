import { connection } from "next/server";
import { z } from "zod";
import { isTranslateLanguage } from "@/lib/translateLanguages";
import type { LanguageCode } from "@/lib/types";
import type { AdLanguageCode, SpeedKey } from "@/lib/voiceOptions";
import { config } from "@/lib/config";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE, isAdLength, isPresenterEngine } from "@/lib/pricing";
import { AD_TONES, DEFAULT_AD_LANGUAGE, DEFAULT_TONE, DIRECTION_MAX_CHARS, HEX_COLOR, OFFER_MAX_CHARS, CAPTION_STYLES, FONT_KEYS } from "@/lib/adOptions";
import { AD_LANGUAGE_CODES, DEFAULT_SPEED, SPEEDS } from "@/lib/voiceOptions";
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

const AdBody = z.object({
  workflow: z.literal("ad"),
  name: z.string().trim().min(2).max(120),
  seconds: z.number().refine(isAdLength, { error: "Choose one of the offered ad lengths." }).default(DEFAULT_AD_SECONDS),
  engine: z.string().refine(isPresenterEngine, { error: "Choose Standard or Premium." }).default(DEFAULT_PRESENTER_ENGINE),
  lookId: z.string().regex(/^[a-f0-9]{32}$/).optional(),
  language: z.enum(AD_LANGUAGE_CODES as [string, ...string[]]).default(DEFAULT_AD_LANGUAGE),
  accent: z.string().trim().max(12).optional().or(z.literal("")),
  voiceId: z.string().trim().regex(/^[A-Za-z0-9_-]{6,64}$/).optional().or(z.literal("")),
  speed: z.enum(SPEEDS.map((s) => s.key) as [string, ...string[]]).default(DEFAULT_SPEED),
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
  sourceLanguage: z.string().refine((v) => v === "auto" || isTranslateLanguage(v), { error: "Unknown source language." }),
  targetLanguages: z.array(z.string().refine(isTranslateLanguage, { error: "Unknown target language." })).min(1).max(20),
  quality: z.enum(["speed", "precision"]),
  keepTerms: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  format: z.enum(["original", "9:16"]),
  enhance: z.boolean(),
  rightsConfirmed: z.literal(true, { error: "Confirm the rights to the video first." }),
}).refine((b) => !b.targetLanguages.includes(b.sourceLanguage), { error: "A target language cannot be the same as the spoken language." });

/** Creates a draft project. Files are uploaded next (signed URLs), then /start runs the workflow. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ workflow?: string }>(request);
  if (!body) return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  try {
    if (body.workflow === "ad") {
      const a = AdBody.parse(body);
      const row = await createDraft({ workflow: "ad", ad: { name: a.name, seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language as AdLanguageCode, accent: a.accent || undefined, voiceId: a.voiceId || undefined, speed: a.speed as SpeedKey, offer: a.offer || undefined, direction: a.direction || undefined, tone: a.tone, backgroundColor: a.backgroundColor, brand: a.brand, reviewScript: a.reviewScript, productName: a.productName, productUrl: a.productUrl || undefined, description: a.description, script: a.script || undefined } });
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
