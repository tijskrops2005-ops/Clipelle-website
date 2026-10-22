import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { crc32, safeZipName, zipToBuffer } from "./zip";

describe("zip writer", () => {
  it("computes CRC-32 like everyone else", () => {
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
  it("makes safe, unique file names", () => {
    const taken = new Set<string>();
    expect(safeZipName("Glow launch: v2/final?.mp4", taken)).toBe("Glow launch v2 final .mp4");
    expect(safeZipName("Glow launch", taken)).toBe("Glow launch.mp4");
    expect(safeZipName("Glow launch", taken)).toBe("Glow launch (2).mp4");
  });
  it("produces an archive the system unzip can read back", async () => {
    const a = new TextEncoder().encode("hello from a");
    const b = new TextEncoder().encode("second file, a bit longer than the first one");
    const zip = await zipToBuffer([
      { name: "a.txt", size: a.length, data: [a] },
      { name: "b.txt", size: b.length, data: [b.subarray(0, 10), b.subarray(10)] },
    ]);
    const dir = mkdtempSync(join(tmpdir(), "clipelle-zip-"));
    writeFileSync(join(dir, "t.zip"), zip);
    const listing = execFileSync("unzip", ["-l", join(dir, "t.zip")], { encoding: "utf8" });
    expect(listing).toContain("a.txt");
    expect(listing).toContain("b.txt");
    const ok = execFileSync("unzip", ["-t", join(dir, "t.zip")], { encoding: "utf8" });
    expect(ok).toContain("No errors detected");
    const bOut = execFileSync("unzip", ["-p", join(dir, "t.zip"), "b.txt"], { encoding: "utf8" });
    expect(bOut).toBe("second file, a bit longer than the first one");
  });
});
