import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { postBySlug } from "@/lib/blog";
import { config } from "@/lib/config";

export const alt = "Article cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Own-design social image for an article: ink background, accent bar, title, category. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  const title = post?.title ?? config.productName;
  const label = post?.categoryLabel ?? "Blog";
  const icon = await readFile(path.join(process.cwd(), "public", "brand", "icon-192.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#111114", color: "#FFFFFF", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={iconSrc} alt="" width={56} height={56} style={{ width: 56, height: 56 }} />
          <div style={{ fontSize: 30, fontWeight: 600 }}>{config.productName}</div>
          <div style={{ marginLeft: "auto", fontSize: 22, color: "#B8B8BE", letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ width: 120, height: 10, borderRadius: 5, background: "#D43F1B" }} />
          <div style={{ fontSize: title.length > 60 ? 54 : 64, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div>
        </div>
      </div>
    ),
    size,
  );
}
