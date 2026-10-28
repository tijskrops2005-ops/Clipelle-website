import { describe, expect, it } from "vitest";
import { glossaryLanguageCode, glossaryReplacements, replacementsFor } from "./localizedTerms";

describe("words to replace, per language", () => {
  const replace = [{ from: "the RYZE Ritual Set", to: "the best set ever" }];
  const localized = {
    nl: [{ from: "the RYZE Ritual Set", to: "de beste set ooit" }],
    "dutch-belgium": [{ from: "the RYZE Ritual Set", to: "de allerbeste set" }],
    de: [{ from: "the RYZE Ritual Set", to: "das beste Set aller Zeiten" }],
  };

  it("uses the base language code the service expects", () => {
    expect(glossaryLanguageCode("nl")).toBe("nl");
    expect(glossaryLanguageCode("dutch-belgium")).toBe("nl");
    expect(glossaryLanguageCode("english-uk")).toBe("en");
  });

  it("gives every language its own replacement, one per base language", () => {
    expect(glossaryReplacements(replace, localized, ["nl", "dutch-belgium", "de"])).toEqual([
      { from: "the RYZE Ritual Set", to: "de beste set ooit", code: "nl" },
      { from: "the RYZE Ritual Set", to: "das beste Set aller Zeiten", code: "de" },
    ]);
  });

  it("falls back to the customer's own text for every language", () => {
    expect(glossaryReplacements(replace, null, ["nl"])).toEqual(replace);
    expect(replacementsFor("fr", replace, localized)).toEqual(replace);
    expect(replacementsFor("de", replace, localized)).toEqual(localized.de);
  });
});

describe("one way to say a name, per language", () => {
  it("gives one pronunciation per name and base language", async () => {
    const { glossaryPronunciations } = await import("./localizedTerms");
    const p = { nl: [{ term: "Ritual", pronunciation: "Ritsjoeal" }], "dutch-belgium": [{ term: "ritual", pronunciation: "Rietsjoeal" }], de: [] };
    expect(glossaryPronunciations(p, ["nl", "dutch-belgium", "de"])).toEqual([{ term: "Ritual", pronunciation: "Ritsjoeal", code: "nl" }]);
    expect(glossaryPronunciations(null, ["nl"])).toEqual([]);
  });
});
