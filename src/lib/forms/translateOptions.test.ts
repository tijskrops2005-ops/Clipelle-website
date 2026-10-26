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
