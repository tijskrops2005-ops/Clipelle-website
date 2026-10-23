import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";

export const alt = "Clipelle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social image for every page without its own: the light logo on ink (brand style guide), the tagline under it. */
export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), "public", "brand", "clipelle-logo-light-600.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, background: "#111114", color: "#F5EAD9", fontFamily: "sans-serif" }}>
        <img src={src} alt="" width={560} height={213} style={{ width: 560, height: 213 }} />
        <div style={{ fontSize: 30, color: "#B8B8BE", textAlign: "center", maxWidth: 820 }}>{config.tagline}</div>
      </div>
    ),
    size,
  );
}
