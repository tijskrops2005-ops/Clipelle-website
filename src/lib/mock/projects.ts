import { config } from "@/lib/config";
import type { Project } from "@/lib/types";

/**
 * MOCK DATA — simulated projects for the frontend skeleton (Stage 4).
 * Nothing here comes from a real service. Replaced by real storage in Stage 8.
 */
export const mockProjects: Project[] = [
  {
    id: "prj_001",
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
    name: "Trail Bottle — UGC style",
    productName: "Trail Insulated Bottle 750ml",
    description:
      "Keeps drinks cold for 24h. Leak-proof lid, fits every bike cage.",
    imageUrls: [],
    status: "processing",
    steps: {
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
    name: "Desk Lamp — Autumn promo",
    productName: "Lumo Desk Lamp",
    description: "Warm, dimmable LED lamp with wireless charging base.",
    imageUrls: [],
    status: "failed",
    steps: {
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
    name: "Pet Brush — Holiday bundle",
    productName: "FurEase Grooming Brush",
    description: "Self-cleaning pet brush that removes 95% of loose fur.",
    imageUrls: [],
    status: "completed",
    steps: {
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
    name: "Sleep Tea — Evening ritual",
    productName: "Nightfall Herbal Tea",
    description: "Caffeine-free chamomile and valerian blend for better sleep.",
    imageUrls: [],
    status: "draft",
    steps: {
      productClip: { status: "waiting" },
      presenter: { status: "waiting" },
      finalEdit: { status: "waiting" },
    },
    createdAt: "2026-10-11T18:20:00Z",
  },
];
