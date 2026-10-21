/** Features people can join a waitlist for. The page says what it will be; nothing here works yet. */
export const WAITLIST_FEATURES = ["slack", "ad-launcher"] as const;
export type WaitlistFeature = (typeof WAITLIST_FEATURES)[number];
export const WAITLIST_LABELS: Record<WaitlistFeature, string> = { slack: "Slack bot", "ad-launcher": "Ad Launcher" };
export function isWaitlistFeature(v: unknown): v is WaitlistFeature {
  return typeof v === "string" && (WAITLIST_FEATURES as readonly string[]).includes(v);
}
