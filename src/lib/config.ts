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
  /** Placeholder clip served from /public while no real final-edit output exists. */
  demoVideoUrl: "/demo/sample-video.mp4",
  /**
   * Provider behind each step. Shown only as the small mono label on step cards
   * and in Settings, so a provider can be swapped without touching screens.
   */
  services: {
    script: "Claude",
    productClip: "fal.ai",
    presenter: "HeyGen",
    finalEdit: "Shotstack",
  },
} as const;
