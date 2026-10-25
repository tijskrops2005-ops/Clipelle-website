import { ImageUp, Languages, Link2, Palette, Share2, ShoppingBag, type LucideIcon } from "lucide-react";

/**
 * The tools of the app, in one list for the sidebar, the tool search (⌘K) and the dashboard's quick
 * actions. "Soon" items are features announced elsewhere (Settings → Connections, the integration
 * pages); they link to where a visitor can leave a wish and never pretend to work.
 */
export type Tool = { key: string; href: string; label: string; text: string; icon: LucideIcon; soon?: boolean };

export const STUDIO_TOOLS: Tool[] = [
  { key: "translate", href: "/new/translate", label: "Translate a video", text: "A video you own in other languages, with the speaker's own voice and matching lips.", icon: Languages },
  { key: "ad", href: "/new/ad", label: "Ad from a photo", text: "A product photo and a few sentences become a 9:16 ad with a presenter and captions.", icon: ImageUp },
  { key: "url", href: "/new/url", label: "Ad from a link", text: "Paste a product page; name, description and photos fill the ad form for you to check.", icon: Link2 },
  { key: "brand", href: "/settings/brand", label: "Brand style", text: "Accent colour, caption look, font and logo, prefilled on every new ad.", icon: Palette },
];

export const SOON_TOOLS: Tool[] = [
  { key: "tiktok", href: "/settings/connections", label: "Publish to TikTok", text: "Post a finished ad straight from the project page.", icon: Share2, soon: true },
  { key: "reels", href: "/settings/connections", label: "Publish to Reels", text: "Post a finished ad to Instagram Reels from the project page.", icon: Share2, soon: true },
  { key: "shorts", href: "/settings/connections", label: "Publish to Shorts", text: "Post a finished ad to YouTube Shorts from the project page.", icon: Share2, soon: true },
  { key: "shopify", href: "/settings/connections", label: "Import from Shopify", text: "Pick a product and let its name, description and photos fill the form.", icon: ShoppingBag, soon: true },
];

/** Opens the tool search from anywhere (sidebar, top bar, dashboard); the menu listens for it. */
export const OPEN_TOOLS_EVENT = "clipelle:open-tools";
export function openToolSearch() {
  window.dispatchEvent(new Event(OPEN_TOOLS_EVENT));
}
