import { describe, expect, it } from "vitest";
import { validateTranslateForm, type TranslateFormState } from "./translateDraft";

const base: TranslateFormState = { projectName: "Founder story", source: "en", targets: ["nl"], quality: "speed", rights: false, keepTerms: "", format: "9:16", enhance: false, trimSilence: false, captionPosition: "low" };

describe("rights on a reused source", () => {
  it("a localized ad needs no tick (generated here), a reused upload asks again, an upload always asks", () => {
    expect(validateTranslateForm({ ...base, sourceAd: { id: "ad", seconds: 30 } }).rights).toBeUndefined();
    expect(validateTranslateForm({ ...base, sourceAd: { id: "tr", seconds: 30 }, rightsRequired: true }).rights).toBeDefined();
    expect(validateTranslateForm({ ...base, sourceAd: { id: "tr", seconds: 30 }, rightsRequired: true, rights: true }).rights).toBeUndefined();
    expect(validateTranslateForm({ ...base, video: { file: new File([], "a.mp4"), seconds: 10 } }).rights).toBeDefined();
  });
});
