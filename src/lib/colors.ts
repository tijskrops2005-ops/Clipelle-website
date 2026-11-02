/**
 * Colours for the one colour picker (2 Nov 2026, src/components/ui/ColorPicker.tsx): a grid of
 * standard colours, hex parsing and the HSV conversions behind the custom area. Pure and
 * browser-safe; tested in colors.test.ts.
 */
export const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** "#abc", "abc", "AABBCC" or "#aabbcc" → "#AABBCC"; anything else → null. */
export function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) return `#${v.split("").map((c) => c + c).join("").toUpperCase()}`;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  return null;
}

export type Hsv = { h: number; s: number; v: number };

export function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r1)}${to(g1)}${to(b1)}`.toUpperCase();
}

/** Each family light, mid and dark, plus white, greys and black: about thirty, the ones people reach for. */
export const COLOR_FAMILIES: { name: string; light: string; mid: string; dark: string }[] = [
  { name: "Red", light: "#FCA5A5", mid: "#D43F1B", dark: "#7F1D1D" },
  { name: "Orange", light: "#FDBA74", mid: "#F97316", dark: "#9A3412" },
  { name: "Yellow", light: "#FDE68A", mid: "#FFD400", dark: "#A16207" },
  { name: "Green", light: "#86EFAC", mid: "#22C55E", dark: "#14532D" },
  { name: "Teal", light: "#5EEAD4", mid: "#14B8A6", dark: "#134E4A" },
  { name: "Blue", light: "#93C5FD", mid: "#2563EB", dark: "#1E3A8A" },
  { name: "Purple", light: "#C4B5FD", mid: "#7C3AED", dark: "#4C1D95" },
  { name: "Pink", light: "#F9A8D4", mid: "#EC4899", dark: "#831843" },
  { name: "Brown", light: "#D6BCA4", mid: "#92400E", dark: "#451A03" },
];

export const COLOR_GRID: { hex: string; label: string }[] = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#E5E7EB", label: "Light grey" },
  { hex: "#9CA3AF", label: "Grey" },
  { hex: "#4B5563", label: "Dark grey" },
  { hex: "#111114", label: "Black" },
  ...COLOR_FAMILIES.flatMap((f) => [
    { hex: f.light, label: `Light ${f.name.toLowerCase()}` },
    { hex: f.mid, label: f.name },
    { hex: f.dark, label: `Dark ${f.name.toLowerCase()}` },
  ]),
];

/** The grid's name for a colour, else the hex itself. */
export function colorLabel(hex: string) {
  return COLOR_GRID.find((c) => c.hex.toUpperCase() === hex.toUpperCase())?.label ?? hex.toUpperCase();
}
