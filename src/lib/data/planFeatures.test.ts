import { describe, expect, it } from "vitest";
import { lockedFeature } from "./server";

const ad = (engine: string) => ({ workflow: "ad" as const, input: { engine, seconds: 30 } as never });
const tr = (quality: string, enhance = false) => ({ workflow: "translate" as const, input: { quality, enhance, targetLanguages: ["nl"] } as never });

describe("plan features on the server", () => {
  it("locks Premium and Precision below Pro, enhancement below Scale, whatever the level", () => {
    expect(lockedFeature(ad("avatar_iv"), "starter_3")).toMatch(/Premium presenter comes with the Pro plan/);
    expect(lockedFeature(ad("avatar_iv"), "pro")).toBeNull();
    expect(lockedFeature(ad("avatar_iii"), "free")).toBeNull();
    expect(lockedFeature(tr("precision"), "starter")).toMatch(/Precision translation comes with the Pro plan/);
    expect(lockedFeature(tr("precision"), "pro_2")).toBeNull();
    expect(lockedFeature(tr("speed", true), "pro_3")).toMatch(/enhancement comes with the Scale plan/);
    expect(lockedFeature(tr("speed", true), "scale")).toBeNull();
    expect(lockedFeature(tr("precision", true), "business_249")).toBeNull();
  });
});
