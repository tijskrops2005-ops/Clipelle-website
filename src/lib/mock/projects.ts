import { config } from "@/lib/config";
import type { Project } from "@/lib/types";
import { demoSegments } from "./translations";

/**
 * MOCK DATA — simulated projects for the frontend skeleton (Stage 4).
 * Nothing here comes from a real service. Replaced by real storage in Stage 8.
 */
export const mockProjects: Project[] = [
  {
    id: "prj_001",
    workflow: "ad",
    name: "Glow Serum — Launch ad",
    productName: "Glow Vitamin C Serum",
    productUrl: "https://example.com/products/glow-serum",
    description:
      "Lightweight vitamin C serum that brightens skin in 14 days. Vegan, fragrance-free.",
    imageUrls: [],
    script:
      "Tired of dull skin? Meet Glow — the serum that brightens in two weeks. Tap to shop.",
    status: "completed",
    steps: {
      script: { status: "completed", startedAt: "2026-10-16T09:01:10Z", finishedAt: "2026-10-16T09:01:50Z" },
      productClip: {
        status: "completed",
        startedAt: "2026-10-16T09:02:00Z",
        finishedAt: "2026-10-16T09:06:30Z",
      },
      presenter: {
        status: "completed",
        startedAt: "2026-10-16T09:02:00Z",
        finishedAt: "2026-10-16T09:08:10Z",
      },
      finalEdit: {
        status: "completed",
        startedAt: "2026-10-16T09:08:15Z",
        finishedAt: "2026-10-16T09:12:40Z",
      },
    },
    finalVideoUrl: config.demoVideoUrl, // placeholder clip — no real video exists in demo mode
    createdAt: "2026-10-16T09:01:00Z",
  },
  {
    id: "prj_002",
    workflow: "ad",
    name: "Trail Bottle — UGC style",
    productName: "Trail Insulated Bottle 750ml",
    description:
      "Keeps drinks cold for 24h. Leak-proof lid, fits every bike cage.",
    imageUrls: [],
    status: "processing",
    steps: {
      script: { status: "completed", startedAt: "2026-10-18T07:39:10Z", finishedAt: "2026-10-18T07:39:50Z" },
      productClip: {
        status: "completed",
        startedAt: "2026-10-18T07:40:00Z",
        finishedAt: "2026-10-18T07:44:20Z",
      },
      presenter: { status: "processing", startedAt: "2026-10-18T07:40:00Z" },
      finalEdit: { status: "waiting" },
    },
    createdAt: "2026-10-18T07:39:00Z",
  },
  {
    id: "prj_003",
    workflow: "ad",
    name: "Desk Lamp — Autumn promo",
    productName: "Lumo Desk Lamp",
    description: "Warm, dimmable LED lamp with wireless charging base.",
    imageUrls: [],
    status: "failed",
    steps: {
      script: { status: "completed", startedAt: "2026-10-15T13:59:00Z", finishedAt: "2026-10-15T13:59:40Z" },
      productClip: {
        status: "completed",
        startedAt: "2026-10-15T14:00:00Z",
        finishedAt: "2026-10-15T14:05:00Z",
      },
      presenter: {
        status: "failed",
        startedAt: "2026-10-15T14:00:00Z",
        finishedAt: "2026-10-15T14:03:00Z",
        error:
          "The presenter video could not be generated because the script was empty. Add a script and retry.",
      },
      finalEdit: { status: "waiting" },
    },
    createdAt: "2026-10-15T13:58:00Z",
  },
  {
    id: "prj_004",
    workflow: "ad",
    name: "Pet Brush — Holiday bundle",
    productName: "FurEase Grooming Brush",
    description: "Self-cleaning pet brush that removes 95% of loose fur.",
    imageUrls: [],
    status: "completed",
    steps: {
      script: { status: "completed", startedAt: "2026-10-12T09:59:00Z", finishedAt: "2026-10-12T09:59:40Z" },
      productClip: {
        status: "completed",
        startedAt: "2026-10-12T10:00:00Z",
        finishedAt: "2026-10-12T10:04:00Z",
      },
      presenter: {
        status: "completed",
        startedAt: "2026-10-12T10:00:00Z",
        finishedAt: "2026-10-12T10:07:00Z",
      },
      finalEdit: {
        status: "completed",
        startedAt: "2026-10-12T10:07:05Z",
        finishedAt: "2026-10-12T10:11:00Z",
      },
    },
    finalVideoUrl: config.demoVideoUrl,
    createdAt: "2026-10-12T09:58:00Z",
  },
  {
    id: "prj_005",
    workflow: "ad",
    name: "Sleep Tea — Evening ritual",
    productName: "Nightfall Herbal Tea",
    description: "Caffeine-free chamomile and valerian blend for better sleep.",
    imageUrls: [],
    status: "draft",
    steps: {
      script: { status: "waiting" },
      productClip: { status: "waiting" },
      presenter: { status: "waiting" },
      finalEdit: { status: "waiting" },
    },
    createdAt: "2026-10-11T18:20:00Z",
  },
  {
    id: "prj_006",
    workflow: "translate",
    name: "Founder story — DE + FR",
    status: "review",
    sourceFileName: "founder-story.mp4",
    sourceSeconds: 28,
    sourceVideoUrl: config.demoVideoUrl,
    sourceLanguage: "auto",
    detectedLanguage: "en",
    targetLanguages: ["de", "fr"],
    quality: "speed",
    rightsConfirmedAt: "2026-10-18T15:01:00Z",
    steps: {
      upload: { status: "completed", startedAt: "2026-10-18T15:01:00Z", finishedAt: "2026-10-18T15:01:04Z" },
      translate: { status: "completed", startedAt: "2026-10-18T15:01:04Z", finishedAt: "2026-10-18T15:04:40Z" },
      review: { status: "needs_input", startedAt: "2026-10-18T15:04:40Z" },
      captions: { status: "waiting" },
    },
    translations: [
      { language: "de", status: "waiting", segments: demoSegments(28, "en", "de") },
      { language: "fr", status: "waiting", segments: demoSegments(28, "en", "fr") },
    ],
    createdAt: "2026-10-18T15:00:00Z",
  },
];
