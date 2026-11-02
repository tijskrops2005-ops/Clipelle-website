import { describe, expect, it } from "vitest";
import { consumeRecoveryCode, generateRecoveryCodes, hashRecoveryCodes, normalizeRecoveryCode, recoveryCodesLeft } from "./mfaRecovery";

describe("recovery codes", () => {
  it("makes eight readable codes without look-alike characters", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    for (const c of codes) expect(c).toMatch(/^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/);
    expect(new Set(codes).size).toBe(8);
  });

  it("accepts a code once, in any spelling, and counts what is left", async () => {
    let call = 0;
    const codes = generateRecoveryCodes(3, (n) => new Uint8Array(n).map((_, i) => i * 7 + 3 + 11 * call++));
    const stored = await hashRecoveryCodes(codes);
    expect(recoveryCodesLeft(stored)).toBe(3);
    const spelled = codes[1].toUpperCase().replace(/-/g, " ");
    expect(normalizeRecoveryCode(spelled)).toBe(codes[1].replace(/-/g, ""));
    const after = await consumeRecoveryCode(stored, spelled, new Date("2026-11-02T10:00:00Z"));
    expect(after).not.toBeNull();
    expect(recoveryCodesLeft(after)).toBe(2);
    expect(after![1].usedAt).toBe("2026-11-02T10:00:00.000Z");
    expect(await consumeRecoveryCode(after, codes[1])).toBeNull();
    expect(await consumeRecoveryCode(after, "nope")).toBeNull();
    expect(await consumeRecoveryCode(null, codes[0])).toBeNull();
  });
});
