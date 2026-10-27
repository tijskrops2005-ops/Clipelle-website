import { brand } from "@/lib/brand";

/**
 * App-wide constants. The product name and tagline come from src/lib/brand.ts (the one place for
 * the brand); they are mirrored here so older imports keep working.
 */
export const config = {
  productName: brand.name,
  tagline: brand.tagline,
  /**
   * While true, the UI runs on simulated data from src/lib/mock and shows a visible
   * "Demo mode" label. Set NEXT_PUBLIC_DEMO_MODE=false in .env.local to use the database
   * and the real orchestrator instead (Stage 8). Default: on.
   */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  /**
   * What the product offers today (27 Oct 2026, Tijs: translation first). With `ads` off, "Ad from a
   * photo" and "Ad from a link" are announced as coming soon everywhere (app, site, API) and the
   * server refuses to start one; nothing is deleted. NEXT_PUBLIC_ADS_ENABLED=true turns them back on.
   */
  features: {
    ads: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",
  },
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
    finalEdit: "Captions and 9:16",
    upload: "Secure upload",
    translate: "AI translation",
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
