import "server-only";
import type { ClipModelKey } from "@/lib/services/productClip";
import type { HeygenEngine } from "@/lib/services/heygen";

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
  /** fal.ai image-to-video model for the product clip. */
  clipModel: (process.env.PRODUCT_CLIP_MODEL?.trim() === "kling" ? "kling" : "minimax") as ClipModelKey,
  /** Planned ad length in seconds (script planning). */
  adSeconds: Number(process.env.AD_TARGET_SECONDS) > 0 ? Number(process.env.AD_TARGET_SECONDS) : 30,
  /** Language of the generated script (BCP-47). */
  adLanguage: process.env.AD_LANGUAGE?.trim() || "en",
  /** How long we keep polling a provider before giving up (minutes). */
  maxWaitMinutes: 45,
  /** Seconds between status checks. */
  pollSeconds: 20,
} as const;
