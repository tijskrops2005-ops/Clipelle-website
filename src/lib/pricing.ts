import type { TranslationQuality } from "@/lib/types";

/**
 * Every rate the app uses, in one place, safe for the browser (no secrets). Forms show the
 * estimate before a project starts; the server refuses a start above the budget with the
 * same numbers; the cost guard records what each call really cost.
 *
 * Rates are published list prices on 2026-10-19 (sources in docs/vendors/*). Shotstack is
 * counted as $0.10 per 30-second video everywhere, even when the sandbox renders for free.
 */

export const PRICING = {
  /** Claude script: ~1.5k input + 900 output tokens on claude-opus-5-5 ($4 / $20 per MTok). */
  scriptUsd: 0.03,
  /** Claude ad-tone rewrite of one language version (two short passes at most). */
  rewriteUsd: 0.02,
  /** Bria Expand, only when the product does not fit a 9:16 crop. Counted as "up to". */
  expandUsd: 0.04,
  /** fal.ai image-to-video, USD per generated second. MiniMax promo ends 2026-10-31. */
  clipUsdPerSecond: {
    minimax: { until: "2026-10-31", promo: 0.052, regular: 0.08 }, // H3 Max, 768p
    minimax_turbo: { until: "2026-10-31", promo: 0.052, regular: 0.08 }, // H3 Max Turbo, 1080p
    kling_standard: { until: null, promo: 0.084, regular: 0.084 },
    kling: { until: null, promo: 0.112, regular: 0.112 }, // Pro
  },
  clipSeconds: 5,
  /** HeyGen presenter, USD per second of video (enterprise rate card, 1 credit = $0.50). */
  presenterUsdPerSecond: { avatar_iv: 0.05, avatar_iii: 0.0083 },
  /** Share of a 30 s ad spoken by the presenter (hook 2 s, product 4 s, end card 3 s are not). */
  presenterShare: 0.45,
  /** Shotstack: $10 per 50 minutes ⇒ $0.10 per 30 s video. Always counted, sandbox or not. */
  captionsUsdPer30s: 0.1,
  /** HeyGen video translation, per second of source per target language. */
  translateUsdPerSecond: { speed: 0.025, precision: 0.05 },
  /** HeyGen proofread session, per second of source per language. */
  proofreadUsdPerSecond: 0.00416,
  /** Topaz enhancement on fal.ai, per second at up to 1080p. */
  enhanceUsdPerSecond: 0.02,
} as const;

export type ClipModelKey = keyof typeof PRICING.clipUsdPerSecond;
export type PresenterEngine = keyof typeof PRICING.presenterUsdPerSecond;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function clipUsdPerSecond(model: ClipModelKey, at = new Date()) {
  const m = PRICING.clipUsdPerSecond[model];
  return m.until && at <= new Date(`${m.until}T23:59:59Z`) ? m.promo : m.regular;
}

export function captionsUsd(seconds: number) {
  return round2((Math.max(1, seconds) / 30) * PRICING.captionsUsdPer30s);
}

export type AdEstimateInput = { seconds: number; clipModel: ClipModelKey; engine: PresenterEngine; at?: Date };

/** One click on "Generate video" in Workflow A. */
export function estimateAdCost(input: AdEstimateInput) {
  const presenterSeconds = Math.round(input.seconds * PRICING.presenterShare);
  const parts = {
    script: PRICING.scriptUsd,
    expand: PRICING.expandUsd,
    clip: round2(PRICING.clipSeconds * clipUsdPerSecond(input.clipModel, input.at)),
    presenter: round2(presenterSeconds * PRICING.presenterUsdPerSecond[input.engine]),
    captions: captionsUsd(input.seconds),
  };
  const total = round2(Object.values(parts).reduce((a, b) => a + b, 0));
  return { parts, total, presenterSeconds };
}

export type TranslateEstimateInput = { seconds: number; quality: TranslationQuality; enhance: boolean; languages: number; hasSourceTranscript: boolean };

/** Workflow B: cost per language version, plus the total for all chosen languages. */
export function estimateTranslateCost(input: TranslateEstimateInput) {
  const s = Math.max(1, input.seconds);
  const n = Math.max(1, input.languages);
  const transcriptShare = input.hasSourceTranscript ? round2((s * PRICING.proofreadUsdPerSecond) / n) : 0;
  const perLanguage = {
    proofread: round2(s * PRICING.proofreadUsdPerSecond + transcriptShare),
    rewrite: PRICING.rewriteUsd,
    render: round2(s * PRICING.translateUsdPerSecond[input.quality]),
    enhance: input.enhance ? round2(s * PRICING.enhanceUsdPerSecond) : 0,
    captions: captionsUsd(s),
  };
  const perLanguageTotal = round2(Object.values(perLanguage).reduce((a, b) => a + b, 0));
  return { perLanguage, perLanguageTotal, total: round2(perLanguageTotal * n) };
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

/** Agreed in docs/cost-quality.md §12: MiniMax Turbo 1080p during the promo, Kling v3 Standard from 1 November. */
export function defaultClipModel(at = new Date()): ClipModelKey {
  return at < new Date("2026-11-01T00:00:00Z") ? "minimax_turbo" : "kling_standard";
}

/** Defaults the orchestrator uses unless .env.local overrides them (mirrored in src/lib/workflow/settings.ts). */
export const DEFAULTS = { adSeconds: 30, clipModel: defaultClipModel(), engine: "avatar_iv" as PresenterEngine, presenterResolution: "1080p" as const };
