import { describe, expect, it } from "vitest";
import { buildAdDraft, validateAdForm, type AdFormState } from "./adDraft";
import { buildTranslateDraft, validateTranslateForm, type TranslateFormState } from "./translateDraft";
import { AD_LENGTHS, estimateAdCost, estimateTranslateCost, PRESENTER_QUALITIES } from "@/lib/pricing";
import { SPEEDS } from "@/lib/voiceOptions";

/**
 * Snapshot of what the two forms send to the data layer and of the estimates, taken on
 * 2026-10-20 before the visual redesign. The redesign may change how the forms look, never
 * what they send: if a snapshot changes, something functional changed.
 */

const png = new File([new Uint8Array([1, 2, 3])], "product.png", { type: "image/png", lastModified: 0 });
const logo = new File([new Uint8Array([4])], "logo.png", { type: "image/png", lastModified: 0 });
const bg = new File([new Uint8Array([5])], "bg.jpg", { type: "image/jpeg", lastModified: 0 });
const mp4 = new File([new Uint8Array([6, 7])], "clip.mp4", { type: "video/mp4", lastModified: 0 });

const adMinimal: AdFormState = {
  values: { projectName: " Glow launch ", productName: "Glow Serum ", productUrl: "", description: "A lightweight vitamin C serum that brightens dull skin.", script: "", offer: "", direction: "" },
  seconds: 30,
  engine: "avatar_iii",
  backgroundChoice: "own",
  accent: "#D43F1B",
  customAccent: "",
  captionStyle: "bold",
  font: "Roboto",
  reviewScript: false,
  language: "en",
  speed: "normal",
  tone: "direct",
  images: [png],
};

const adFull: AdFormState = {
  values: { projectName: "Trail bottle", productName: "Trail Bottle", productUrl: " https://example.com/p/trail ", description: "Keeps drinks cold for 24 hours on every ride and hike.", script: " Tired of warm water? Meet Trail. ", offer: "20% off this week", direction: "for cyclists, upbeat" },
  seconds: 20,
  engine: "avatar_iv",
  lookId: "d365dda368044f6189ee68af637389ff",
  backgroundChoice: "sand",
  accent: "#1F3A5F",
  customAccent: "#0a0a0a",
  captionStyle: "karaoke",
  font: "Montserrat",
  logo,
  reviewScript: true,
  language: "nl",
  voiceAccent: "be",
  voiceId: "voice_123456",
  speed: "faster",
  tone: "playful",
  images: [png, png],
};

const adImageBackground: AdFormState = { ...adMinimal, backgroundChoice: "image", backgroundImage: bg };

describe("ad form", () => {
  it("validates like before", () => {
    expect(validateAdForm(adMinimal.values, 1)).toEqual({});
    expect(validateAdForm({ ...adMinimal.values, projectName: "x", productName: " ", productUrl: "example.com", description: "short" }, 0)).toMatchSnapshot();
  });

  it("sends the same draft for a minimal form", () => {
    const draft = buildAdDraft(adMinimal);
    expect(draft.images[0]).toBe(png);
    expect(draft).toMatchSnapshot();
  });

  it("sends the same draft for a fully filled form", () => {
    const draft = buildAdDraft(adFull);
    expect(draft.brand?.logo).toBe(logo);
    expect(draft).toMatchSnapshot();
  });

  it("sends the uploaded background image", () => {
    const draft = buildAdDraft(adImageBackground);
    expect(draft.background).toEqual({ type: "image", file: bg });
  });
});

const translateMinimal: TranslateFormState & { video: { file: File; seconds?: number } } = {
  video: { file: mp4, seconds: 8.4 },
  projectName: " Senvia ",
  source: "auto",
  targets: ["nl"],
  quality: "speed",
  rights: true,
  keepTerms: "",
  format: "9:16",
  enhance: false,
  trimSilence: true,
  captionPosition: "low",
};

const translateFull: typeof translateMinimal = {
  video: { file: mp4, seconds: 61 },
  projectName: "Founder story",
  source: "en",
  targets: ["de", "fr", "dutch-belgium"],
  quality: "precision",
  rights: true,
  keepTerms: "Senvia, FlexLid,, \n Trail ",
  format: "original",
  enhance: true,
  trimSilence: false,
  captionPosition: "middle",
};

describe("translate form", () => {
  it("validates like before", () => {
    expect(validateTranslateForm(translateMinimal)).toEqual({});
    expect(validateTranslateForm({ ...translateMinimal, video: undefined, projectName: "", targets: [], rights: false })).toMatchSnapshot();
    expect(validateTranslateForm({ ...translateMinimal, video: { file: mp4, seconds: 400 } })).toMatchSnapshot();
  });

  it("sends the same draft for a minimal form", () => {
    const draft = buildTranslateDraft(translateMinimal);
    expect(draft.video).toBe(mp4);
    expect(draft).toMatchSnapshot();
  });

  it("sends the same draft for a fully filled form", () => {
    expect(buildTranslateDraft(translateFull)).toMatchSnapshot();
  });
});

describe("estimates", () => {
  it("ad estimates per length, quality and speed are unchanged", () => {
    const at = new Date("2026-10-20T12:00:00Z");
    const table: Record<string, unknown> = {};
    for (const seconds of AD_LENGTHS) {
      for (const q of PRESENTER_QUALITIES) {
        for (const sp of SPEEDS) {
          table[`${seconds}s ${q.key} ${sp.key}`] = estimateAdCost({ seconds, clipModel: "minimax_turbo", engine: q.key, speed: sp.value, at });
        }
      }
    }
    table["30s avatar_iii kling_standard"] = estimateAdCost({ seconds: 30, clipModel: "kling_standard", engine: "avatar_iii", at });
    expect(table).toMatchSnapshot();
  });

  it("translate estimates per quality, languages and enhancement are unchanged", () => {
    const table: Record<string, unknown> = {};
    for (const seconds of [8, 30, 60, 180]) {
      for (const quality of ["speed", "precision"] as const) {
        for (const languages of [1, 2, 5]) {
          for (const enhance of [false, true]) {
            for (const hasSourceTranscript of [false, true]) {
              table[`${seconds}s ${quality} ${languages}l ${enhance ? "enh" : "plain"} ${hasSourceTranscript ? "src" : "auto"}`] = estimateTranslateCost({ seconds, quality, enhance, languages, hasSourceTranscript });
            }
          }
        }
      }
    }
    expect(table).toMatchSnapshot();
  });
});
