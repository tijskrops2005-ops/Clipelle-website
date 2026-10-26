import { z } from "zod";
import { CAPTION_COLOR_VALUES, CAPTION_HIGHLIGHTS, CAPTION_SIZES, CAPTION_TEXT_COLOR_VALUES } from "@/lib/captionOptions";
import { PRESENTER_LANGUAGES, PRESENTER_LAYOUTS } from "@/lib/presenterTranslate";
import { isTranslateLanguage } from "@/lib/translateLanguages";
import { config } from "@/lib/config";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE, isAdLength, isPresenterEngine } from "@/lib/pricing";
import { AD_TONES, DEFAULT_AD_LANGUAGE, DEFAULT_TONE, DIRECTION_MAX_CHARS, HEX_COLOR, OFFER_MAX_CHARS, CAPTION_STYLES, FONT_KEYS } from "@/lib/adOptions";
import { AD_LANGUAGE_CODES, DEFAULT_SPEED, SPEEDS } from "@/lib/voiceOptions";
import { FORMAT_KEYS, HOOK_KEYS, MAX_BATCH_VARIANTS, MIN_BATCH_VARIANTS } from "@/content/formats";

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
  /** Format from the library; the form already wrote its direction and tone into the fields above. */
  format: z.enum(FORMAT_KEYS).optional(),
  /** Hook style of a batch variation (informational; the direction already carries it). */
  hook: z.enum(HOOK_KEYS).optional(),
});

/** One variant of "Make variations": a format or a hook style. */
export const VariantBody = z.union([z.object({ format: z.enum(FORMAT_KEYS) }), z.object({ hook: z.enum(HOOK_KEYS) })]);

/** "Make variations": the ad fields once, plus 2–5 variants; every variant becomes its own project. */
export const BatchBody = AdBody.omit({ format: true, hook: true }).extend({
  variants: z.array(VariantBody).min(MIN_BATCH_VARIANTS, { error: `Choose at least ${MIN_BATCH_VARIANTS} variations.` }).max(MAX_BATCH_VARIANTS, { error: `At most ${MAX_BATCH_VARIANTS} variations per batch.` }),
});
export type BatchBodyInput = z.infer<typeof BatchBody>;

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
  /** Caption choices (26 Oct 2026); omitted = the original look. */
  captionStyle: z.object({ show: z.boolean(), highlight: z.enum(CAPTION_HIGHLIGHTS), color: z.enum(CAPTION_COLOR_VALUES), size: z.enum(CAPTION_SIZES), uppercase: z.boolean(), textColor: z.enum(CAPTION_TEXT_COLOR_VALUES) }).partial().optional(),
  /** Sound (26 Oct 2026): strip the background music, clean up the speech. */
  /** Remove text burned into the picture before translating (Pro, 26 Oct 2026). */
  removeText: z.boolean().optional(),
  /** Who speaks the translation (26 Oct 2026): the original speaker (lip-synced, default) or an AI presenter. */
  speaker: z.enum(["original", "presenter"]).optional(),
  presenter: z.object({ engine: z.enum(["avatar_iii", "avatar_iv"]), lookId: z.string().max(100).optional(), voiceId: z.string().max(100).optional(), accent: z.string().max(40).optional(), speed: z.enum(["slower", "normal", "faster"]).optional(), layout: z.enum(PRESENTER_LAYOUTS) }).optional(),
  removeMusic: z.boolean().optional(),
  cleanVoice: z.boolean().optional(),
  rightsConfirmed: z.literal(true, { error: "Confirm the rights to the video first." }),
  /** "Localize this ad": the finished ad (same workspace) is the source; no upload, rights recorded as generated here. */
  sourceProjectId: z.string().uuid().optional(),
});

export const TranslateBody = TranslateFields.refine((b) => !b.targetLanguages.includes(b.sourceLanguage), { error: "A target language cannot be the same as the spoken language." }).refine(
  (b) => b.speaker !== "presenter" || (Boolean(b.presenter) && b.targetLanguages.length === 1 && (PRESENTER_LANGUAGES as string[]).includes(b.targetLanguages[0])),
  { error: "With an AI presenter, pick one target language that has presenter voices." },
);


export type AdBodyInput = z.infer<typeof AdBody>;
export type TranslateBodyInput = z.infer<typeof TranslateBody>;
