import { z } from "zod";
import { isTranslateLanguage } from "@/lib/translateLanguages";
import { config } from "@/lib/config";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE, isAdLength, isPresenterEngine } from "@/lib/pricing";
import { AD_TONES, DEFAULT_AD_LANGUAGE, DEFAULT_TONE, DIRECTION_MAX_CHARS, HEX_COLOR, OFFER_MAX_CHARS, CAPTION_STYLES, FONT_KEYS } from "@/lib/adOptions";
import { AD_LANGUAGE_CODES, DEFAULT_SPEED, SPEEDS } from "@/lib/voiceOptions";

/**
 * The one validation of what a new project may contain, shared by the app's own route
 * (/api/projects) and the public API (/api/v1). Changing a rule here changes both.
 */
export const AdBody = z.object({
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
  /** "Make another version": the ad this one is a version of (same workspace). */
  parentId: z.string().uuid().optional(),
});

/** The translate fields without the cross-field check, so callers can omit/extend before adding it. */
export const TranslateFields = z.object({
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
  trimSilence: z.boolean().default(true),
  captionPosition: z.enum(["low", "middle"]).default("low"),
  rightsConfirmed: z.literal(true, { error: "Confirm the rights to the video first." }),
  /** "Localize this ad": the finished ad (same workspace) is the source; no upload, rights recorded as generated here. */
  sourceProjectId: z.string().uuid().optional(),
});

export const TranslateBody = TranslateFields.refine((b) => !b.targetLanguages.includes(b.sourceLanguage), { error: "A target language cannot be the same as the spoken language." });


export type AdBodyInput = z.infer<typeof AdBody>;
export type TranslateBodyInput = z.infer<typeof TranslateBody>;
