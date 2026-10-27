/** Features people can join a waitlist for. The page says what it will be; nothing here works yet (ads: while config.features.ads is off, 27 Oct 2026). */
export const WAITLIST_FEATURES = ["slack", "ad-launcher", "ads", "url-to-video"] as const;
export type WaitlistFeature = (typeof WAITLIST_FEATURES)[number];
export const WAITLIST_LABELS: Record<WaitlistFeature, string> = { slack: "Slack bot", "ad-launcher": "Ad Launcher", ads: "Image to video", "url-to-video": "URL to video" };
export function isWaitlistFeature(v: unknown): v is WaitlistFeature {
  return typeof v === "string" && (WAITLIST_FEATURES as readonly string[]).includes(v);
}
