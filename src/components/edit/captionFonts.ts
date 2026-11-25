import { Anton, Archivo_Black, Bangers, Bebas_Neue, Montserrat, Permanent_Marker, Poppins, Roboto, Work_Sans } from "next/font/google";
import type { CaptionFontKey } from "@/lib/captionOptions";

/**
 * The caption typefaces in the browser (26 Nov 2026), so the previews show the font the render uses
 * (src/lib/captionOptions.ts CAPTION_FONTS). Not preloaded: a font downloads only when a preview uses it.
 */
const roboto = Roboto({ subsets: ["latin"], weight: "900", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], weight: "900", display: "swap", preload: false });
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: "800", display: "swap", preload: false });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const bangers = Bangers({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const worksans = Work_Sans({ subsets: ["latin"], weight: "900", display: "swap", preload: false });

const FAMILIES: Record<CaptionFontKey, { fontFamily: string; fontWeight?: number }> = {
  roboto: roboto.style,
  montserrat: montserrat.style,
  anton: anton.style,
  bebas: bebas.style,
  poppins: poppins.style,
  archivo: archivo.style,
  bangers: bangers.style,
  marker: marker.style,
  worksans: worksans.style,
};

/** CSS for a caption typeface (Roboto when none or unknown). */
export function captionFontCss(key?: string): { fontFamily: string; fontWeight: number } {
  const f = FAMILIES[(key as CaptionFontKey) ?? "roboto"] ?? FAMILIES.roboto;
  return { fontFamily: f.fontFamily, fontWeight: f.fontWeight ?? 900 };
}
