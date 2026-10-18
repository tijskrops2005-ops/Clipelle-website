/**
 * App-wide constants. "Reelay" is a temporary product name — change it here only.
 */
export const config = {
  productName: "Reelay",
  tagline: "Turn product info into a finished video ad — automatically.",
  /**
   * While true, the UI runs on simulated data from src/lib/mock and shows a
   * visible "Demo mode" label. Flip to false only once real services exist (Stage 7+).
   */
  demoMode: true,
  /** Placeholder clip served from /public while no real VEED output exists. */
  demoVideoUrl: "/demo/sample-video.mp4",
} as const;
