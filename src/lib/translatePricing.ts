import type { TranslationQuality } from "@/lib/types";

/**
 * Cost indication for the translate workflow. Shared by the form (demo mode),
 * the dev test page and the server routes, so every screen shows the same numbers.
 *
 * Source: HeyGen enterprise rate card (developers.heygen.com/docs/enterprise-pricing),
 * 1 credit = $0.50; translations are billed on the source duration per target language.
 * Self-serve rates sit behind a login, so treat these as an indication.
 */
export const HEYGEN_TRANSLATE_USD_PER_SECOND: Record<TranslationQuality, number> = {
  speed: 0.05 * 0.5, // 0.05 credit/s
  precision: 0.1 * 0.5, // 0.1 credit/s
};

/** Proofread session (translation + editable subtitles before the render). */
export const HEYGEN_PROOFREAD_USD_PER_SECOND = 0.00833 * 0.5;

/** Shotstack pay-as-you-go: $10 per 50 minutes of output. Sandbox renders are free. */
export const SHOTSTACK_USD_PER_SECOND = 10 / (50 * 60);

/**
 * Reading/speaking speed used to cap the translated text per fragment.
 * 15 characters per second keeps the new voice at a natural pace inside the
 * original timing (common subtitle guidance is 12–17 cps).
 */
export const MAX_CHARS_PER_SECOND = 15;

export function maxCharsForSegment(start: number, end: number) {
  return Math.max(12, Math.round((end - start) * MAX_CHARS_PER_SECOND));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per target language: proofread + translation render + captions/9:16. */
export function estimatePerLanguageUsd(seconds: number, quality: TranslationQuality) {
  const s = Math.max(1, seconds);
  return {
    proofread: round2(s * HEYGEN_PROOFREAD_USD_PER_SECOND),
    translation: round2(s * HEYGEN_TRANSLATE_USD_PER_SECOND[quality]),
    captions: round2(s * SHOTSTACK_USD_PER_SECOND),
    total: round2(s * (HEYGEN_PROOFREAD_USD_PER_SECOND + HEYGEN_TRANSLATE_USD_PER_SECOND[quality] + SHOTSTACK_USD_PER_SECOND)),
  };
}

export function estimateTotalUsd(seconds: number, quality: TranslationQuality, languageCount: number) {
  return round2(estimatePerLanguageUsd(seconds, quality).total * Math.max(0, languageCount));
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}
