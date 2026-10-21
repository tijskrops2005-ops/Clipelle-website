/**
 * Rules for the brand logo on Settings → Brand, shared by the route, the client check and the
 * tests: PNG, JPG or SVG, at most 2 MB, type decided from the bytes (never from the file name).
 * Browser-safe: no server imports.
 */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = ".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml";

export type LogoKind = { ext: "png" | "jpg" | "svg"; mime: "image/png" | "image/jpeg" | "image/svg+xml" };

/** Sniffs the file type from its first bytes. Returns null for anything that is not PNG, JPG or a plain SVG. */
export function detectLogoKind(bytes: Uint8Array): LogoKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024))).replace(/^﻿/, "").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    const all = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // An SVG is a document: scripts, event handlers and external references have no place in a logo.
    if (/<script|on[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object|xlink:href\s*=\s*["']\s*(https?:|\/\/)/i.test(all)) return null;
    return { ext: "svg", mime: "image/svg+xml" };
  }
  return null;
}

/** Plain-language check used before upload (size) and after sniffing (type). */
export function logoProblem(bytes: number, kind: LogoKind | null): string | null {
  if (bytes === 0) return "The file is empty.";
  if (bytes > MAX_LOGO_BYTES) return `The logo is ${(bytes / (1024 * 1024)).toFixed(1)} MB; the limit is ${MAX_LOGO_BYTES / (1024 * 1024)} MB.`;
  if (!kind) return "Use a PNG, JPG or plain SVG file.";
  return null;
}
