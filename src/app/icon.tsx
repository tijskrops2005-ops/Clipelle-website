import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The favicon: the brand initial on an ink square, drawn here so it always matches the name. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111114", color: "#FFFFFF", borderRadius: 16, fontSize: 40, fontWeight: 700, fontFamily: "sans-serif" }}>
        {brand.name.charAt(0)}
      </div>
    ),
    size,
  );
}
