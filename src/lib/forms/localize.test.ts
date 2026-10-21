import { describe, expect, it } from "vitest";
import { buildTranslateDraft, validateTranslateForm, type TranslateFormState } from "./translateDraft";

/** "Localize this ad": a finished ad as the source instead of an upload. The upload path is covered by forms.test.ts. */
const base: TranslateFormState = { projectName: "Glow launch — translation", source: "en", targets: ["nl", "de"], quality: "speed", rights: false, keepTerms: "Glow", format: "9:16", enhance: false, trimSilence: true, captionPosition: "low" };

describe("localize an ad", () => {
  it("needs no upload and no rights box when a finished ad is the source", () => {
    expect(validateTranslateForm({ ...base, sourceAd: { id: "ad1", seconds: 30 } })).toEqual({});
    expect(validateTranslateForm(base)).toMatchObject({ video: expect.any(String), rights: expect.any(String) });
  });
  it("sends the ad id, its length and rights recorded as generated, and no file", () => {
    const draft = buildTranslateDraft({ ...base, sourceAd: { id: "ad1", seconds: 30 } });
    expect(draft).toEqual({ name: "Glow launch — translation", sourceProjectId: "ad1", sourceSeconds: 30, sourceLanguage: "en", targetLanguages: ["nl", "de"], quality: "speed", keepTerms: ["Glow"], format: "9:16", enhance: false, trimSilence: true, captionPosition: "low", rightsConfirmed: true });
    expect("video" in draft).toBe(false);
  });
});
