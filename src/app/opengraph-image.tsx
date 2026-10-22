import { ImageResponse } from "next/og";
import { config } from "@/lib/config";

export const alt = "Clipelle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social image for every page without its own: name, tagline, a 9:16 frame. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FAFAF7", color: "#111114", padding: 72, fontFamily: "sans-serif", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#111114", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>{config.productName.charAt(0)}</div>
            <div style={{ fontSize: 34, fontWeight: 600 }}>{config.productName}</div>
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>From one product photo to a finished ad</div>
          <div style={{ fontSize: 26, color: "#6B6B70" }}>{config.tagline}</div>
        </div>
        <div style={{ width: 240, height: 426, borderRadius: 36, background: "#111114", border: "8px solid #111114", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div style={{ width: 150, height: 14, borderRadius: 7, background: "#FFFFFF" }} />
            <div style={{ width: 110, height: 14, borderRadius: 7, background: "#D43F1B" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
