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
    translate: "HeyGen",
    captions: "Shotstack",
  },
  /** Hard limits shown to the user before anything is uploaded. */
  limits: {
    /** HeyGen `POST /v3/assets` accepts files up to 32 MB. Larger files need a separate route (not built yet). */
    translateVideoMaxMb: 32,
    /** Keeps a translation test short and cheap; the full product can raise this later. */
    translateVideoMaxSeconds: 180,
  },
  /**
   * Exact wording of the rights confirmation for the translate workflow (rule 7 in CLAUDE.md).
   * Shown as a checkbox; without it no translation starts.
   */
  rightsConfirmationText:
    "Ik heb de rechten op deze video en toestemming van de spreker voor het gebruik van zijn of haar stem en gezicht.",
} as const;
