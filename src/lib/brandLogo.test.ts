import { describe, expect, it } from "vitest";
import { detectLogoKind, logoProblem, MAX_LOGO_BYTES } from "./brandLogo";

const enc = (s: string) => new TextEncoder().encode(s);

describe("brand logo rules", () => {
  it("recognises PNG, JPG and plain SVG from the bytes", () => {
    expect(detectLogoKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.ext).toBe("png");
    expect(detectLogoKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.ext).toBe("jpg");
    expect(detectLogoKind(enc('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'))?.ext).toBe("svg");
    expect(detectLogoKind(enc('﻿  <!-- logo -->\n<svg viewBox="0 0 10 10"></svg>'))?.ext).toBe("svg");
  });

  it("refuses other types, renamed files and SVGs with scripts", () => {
    expect(detectLogoKind(enc("GIF89a"))).toBeNull();
    expect(detectLogoKind(enc("<html><svg></svg></html>"))).toBeNull();
    expect(detectLogoKind(enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectLogoKind(enc('<svg onload="x()"></svg>'))).toBeNull();
    expect(detectLogoKind(enc('<svg><a href="javascript:void(0)"/></svg>'))).toBeNull();
    expect(detectLogoKind(new Uint8Array(0))).toBeNull();
  });

  it("explains size and type problems in plain words", () => {
    expect(logoProblem(0, null)).toMatch(/empty/);
    expect(logoProblem(MAX_LOGO_BYTES + 1, { ext: "png", mime: "image/png" })).toMatch(/limit is 2 MB/);
    expect(logoProblem(100, null)).toMatch(/PNG, JPG or plain SVG/);
    expect(logoProblem(100, { ext: "png", mime: "image/png" })).toBeNull();
  });
});
