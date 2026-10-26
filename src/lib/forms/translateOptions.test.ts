import { describe, expect, it } from "vitest";
import { buildTranslateDraft, type TranslateFormState } from "./translateDraft";
import { DEFAULT_CAPTION_STYLE } from "@/lib/captionOptions";

const base: TranslateFormState = { projectName: "Chair", source: "auto", targets: ["nl"], quality: "speed", rights: true, keepTerms: "", format: "9:16", enhance: false, trimSilence: true, captionPosition: "low", sourceAd: undefined };
const draft = (s: Partial<TranslateFormState>) => buildTranslateDraft({ ...base, ...s, sourceAd: { id: "ad1", seconds: 10 } });

describe("caption and sound choices in the translate draft (26 Oct 2026)", () => {
  it("sends nothing new with the defaults", () => {
    const d = draft({ captionStyle: DEFAULT_CAPTION_STYLE, removeMusic: false, cleanVoice: false });
    expect(d).not.toHaveProperty("captionStyle");
    expect(d).not.toHaveProperty("removeMusic");
    expect(d).not.toHaveProperty("cleanVoice");
  });
  it("sends the caption style and sound options once chosen", () => {
    const style = { ...DEFAULT_CAPTION_STYLE, show: false };
    expect(draft({ captionStyle: style, removeMusic: true, cleanVoice: true })).toMatchObject({ captionStyle: style, removeMusic: true, cleanVoice: true });
  });
});

describe("translate with an AI presenter: what the server accepts (26 Oct 2026)", () => {
  const body = { workflow: "translate", name: "Chair", sourceFileName: "chair.mp4", sourceSeconds: 10, sourceLanguage: "auto", quality: "speed", format: "9:16", enhance: false, rightsConfirmed: true };
  const presenter = { engine: "avatar_iii", layout: "presenter" };
  it("needs exactly one language with presenter voices", async () => {
    const { TranslateBody } = await import("@/lib/data/schemas");
    expect(TranslateBody.safeParse({ ...body, targetLanguages: ["nl"], speaker: "presenter", presenter }).success).toBe(true);
    expect(TranslateBody.safeParse({ ...body, targetLanguages: ["nl", "de"], speaker: "presenter", presenter }).success).toBe(false);
    expect(TranslateBody.safeParse({ ...body, targetLanguages: ["ja"], speaker: "presenter", presenter }).success).toBe(false);
    expect(TranslateBody.safeParse({ ...body, targetLanguages: ["nl"], speaker: "presenter" }).success).toBe(false);
    // The original speaker keeps several languages.
    expect(TranslateBody.safeParse({ ...body, targetLanguages: ["nl", "de"] }).success).toBe(true);
  });
  it("prices the presenter like an ad of that quality, with the ad minimum", async () => {
    const { translateCredits } = await import("@/lib/plans");
    expect(translateCredits({ seconds: 10, quality: "speed", enhance: false, presenterEngine: "avatar_iii" })).toBe(30);
    expect(translateCredits({ seconds: 30, quality: "speed", enhance: false, presenterEngine: "avatar_iii" })).toBe(60);
    expect(translateCredits({ seconds: 30, quality: "speed", enhance: false, presenterEngine: "avatar_iv", removeText: true })).toBe(210);
  });
});
