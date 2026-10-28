import { ImageUp, Languages, Link2, Palette, Share2, ShoppingBag, UserRoundPen, type LucideIcon } from "lucide-react";
import { config } from "@/lib/config";

/**
 * The tools of the app, in one list for the sidebar, the tool search (⌘K) and the dashboard's quick
 * actions. "Soon" items are features announced elsewhere (Settings → Connections, the integration
 * pages); they link to where a visitor can leave a wish and never pretend to work. Since 27 Oct 2026
 * the two ad tools sit in that group while `config.features.ads` is off; their pages explain and offer
 * "Notify me".
 */
export type Tool = { key: string; href: string; label: string; text: string; icon: LucideIcon; soon?: boolean };

const TRANSLATE_TOOLS: Tool[] = [
  { key: "translate", href: "/new/translate", label: "Translate a video", text: "A video you own in other languages, with the speaker's own voice and matching lips.", icon: Languages },
  { key: "presenter", href: "/new/translate?speaker=presenter", label: "Translate with a presenter", text: "The words of your video, translated and spoken by an AI presenter you pick, with the voice and accent you choose.", icon: UserRoundPen },
];

const AD_TOOLS: Tool[] = [
  { key: "ad", href: "/new/ad", label: "Ad from a photo", text: "A product photo and a few sentences become a 9:16 ad with a presenter and captions.", icon: ImageUp },
  { key: "url", href: "/new/url", label: "Ad from a link", text: "Paste a product page; name, description and photos fill the ad form for you to check.", icon: Link2 },
];

const BRAND_TOOL: Tool = { key: "brand", href: "/settings/brand", label: "Brand style", text: "Accent colour, caption look, font and logo, prefilled on every new ad.", icon: Palette };

const PUBLISH_TOOLS: Tool[] = [
  { key: "tiktok", href: "/settings/connections", label: "Publish to TikTok", text: "Post a finished video straight from the project page.", icon: Share2, soon: true },
  { key: "reels", href: "/settings/connections", label: "Publish to Reels", text: "Post a finished video to Instagram Reels from the project page.", icon: Share2, soon: true },
  { key: "shorts", href: "/settings/connections", label: "Publish to Shorts", text: "Post a finished video to YouTube Shorts from the project page.", icon: Share2, soon: true },
  { key: "shopify", href: "/settings/connections", label: "Import from Shopify", text: "Pick a product and let its name, description and photos fill the form.", icon: ShoppingBag, soon: true },
];

export const STUDIO_TOOLS: Tool[] = config.features.ads ? [...TRANSLATE_TOOLS, ...AD_TOOLS, BRAND_TOOL] : TRANSLATE_TOOLS;

export const SOON_TOOLS: Tool[] = config.features.ads ? PUBLISH_TOOLS : [...AD_TOOLS.map((t) => ({ ...t, soon: true })), ...PUBLISH_TOOLS];

/**
 * Which tool is the current page (28 Oct 2026): a tool whose link has a query (`?speaker=presenter`)
 * is active only with that query; a tool without one is active on its path unless another tool on the
 * same path matches the query better.
 */
export function activeToolKey(pathname: string, search: string, tools: Tool[]): string | null {
  const params = new URLSearchParams(search);
  const candidates = tools.filter((t) => !t.soon).map((t) => {
    const url = new URL(t.href, "http://x");
    const wanted = [...url.searchParams.entries()];
    const onPath = pathname === url.pathname || pathname.startsWith(`${url.pathname}/`);
    const queryOk = wanted.every(([k, v]) => params.get(k) === v);
    return { key: t.key, ok: onPath && queryOk, score: wanted.length };
  });
  const best = candidates.filter((c) => c.ok).sort((a, b) => b.score - a.score)[0];
  return best?.key ?? null;
}

/** Opens the tool search from anywhere (sidebar, top bar, dashboard); the menu listens for it. */
export const OPEN_TOOLS_EVENT = "clipelle:open-tools";
export function openToolSearch() {
  window.dispatchEvent(new Event(OPEN_TOOLS_EVENT));
}
