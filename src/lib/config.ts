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
   * Provider behind each step. Internal only: shown on the /dev test pages, never to
   * customers. Customer screens use stepLabels below.
   */
  services: {
    script: "Claude",
    productClip: "fal.ai",
    presenter: "HeyGen",
    finalEdit: "Shotstack",
    translate: "HeyGen",
    captions: "Shotstack",
  },
  /**
   * Generic step descriptors for the mono micro-label on step cards and in explainers.
   * Never a provider name: customers see what a step does, not who runs it.
   */
  stepLabels: {
    script: "AI script",
    productClip: "AI product footage",
    presenter: "AI presenter",
    finalEdit: "Captions, music and 9:16",
    upload: "Secure upload",
    translate: "AI translation",
    review: "Your review",
    captions: "Captions and 9:16",
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
    "I own the rights to this video and have the speaker's permission to use their voice and face.",
} as const;
