import "server-only";
import { CLIP_MODELS, type ClipModelKey } from "@/lib/services/productClip";
import type { HeygenEngine } from "@/lib/services/heygen";
import { DEFAULT_AD_SECONDS, defaultClipModel, isAdLength } from "@/lib/pricing";

function clipModelFromEnv(): ClipModelKey {
  const raw = process.env.PRODUCT_CLIP_MODEL?.trim();
  return raw && raw in CLIP_MODELS ? (raw as ClipModelKey) : defaultClipModel();
}

/**
 * Orchestrator defaults, overridable from .env.local without code changes.
 * Chosen values come from the /dev test pages (look and voice ids are free to list there).
 */
export const workflowSettings = {
  /** HeyGen look id (avatar) for the presenter. Empty: the first public look that supports the engine. */
  heygenLookId: process.env.HEYGEN_DEFAULT_LOOK_ID?.trim() || "",
  /** HeyGen voice id. Empty: the look's default voice, else the first public voice. */
  heygenVoiceId: process.env.HEYGEN_DEFAULT_VOICE_ID?.trim() || "",
  heygenEngine: (process.env.HEYGEN_DEFAULT_ENGINE?.trim() === "avatar_iii" ? "avatar_iii" : "avatar_iv") as HeygenEngine,
  /** Presenter resolution; no surcharge for 1080p in HeyGen's API rate card (docs/cost-quality.md §4). */
  heygenResolution: (process.env.HEYGEN_DEFAULT_RESOLUTION?.trim() === "720p" ? "720p" : "1080p") as "720p" | "1080p",
  /** fal.ai image-to-video model for the product clip (docs/cost-quality.md §2). Empty: date-based default. */
  clipModel: clipModelFromEnv(),
  /** Claude model for the ad-tone rewrite of subtitles (docs/cost-quality.md §1). */
  rewriteModel: process.env.REWRITE_MODEL?.trim() || "claude-sonnet-5-5",
  /** Fallback ad length for projects without a chosen length; must be one of AD_LENGTHS (src/lib/pricing.ts). */
  adSeconds: isAdLength(Number(process.env.AD_TARGET_SECONDS)) ? Number(process.env.AD_TARGET_SECONDS) : DEFAULT_AD_SECONDS,
  /** Language of the generated script (BCP-47). */
  adLanguage: process.env.AD_LANGUAGE?.trim() || "en",
  /** How long we keep polling a provider before giving up (minutes). */
  maxWaitMinutes: 45,
  /** Seconds between status checks. */
  pollSeconds: 20,
} as const;
