import { Captions, Eraser, FileText, ImageUp, Languages, Link2, RectangleVertical, Scissors, Sparkles, UserRoundPen, Wand2, Wallpaper, type LucideIcon } from "lucide-react";
import { config } from "@/lib/config";

/**
 * The tools of the app, in one list for the sidebar, the All tools page (/app/tools), the tool search (⌘K)
 * and the dashboard. Every tool here works today, except the ones marked `soon`: those never pretend
 * to work; their pages explain and offer "Notify me". 25 Nov 2026 (Tijs): tools are grouped in four
 * categories, each with its own colour (`tone`, tokens in globals.css), and the video editor and the
 * enhancer are tools like the others.
 */
export type ToolCategory = "translate" | "edit" | "enhance" | "create";
export type Tool = {
  key: string;
  href: string;
  label: string;
  /** One sentence: what you get. */
  text: string;
  icon: LucideIcon;
  category: ToolCategory;
  /** What the tool can do, as short words on its card (only what really works). */
  chips?: string[];
  soon?: boolean;
  isNew?: boolean;
};

export const TOOL_CATEGORIES: { key: ToolCategory; label: string; text: string }[] = [
  { key: "translate", label: "Video translation", text: "Your video in other languages, with matching lips and captions." },
  { key: "edit", label: "Video editing", text: "Trim, cut, captions, text and your logo on a finished video." },
  { key: "enhance", label: "Enhance and clean up", text: "Sharper, bigger videos and photos, and photos without their background." },
  { key: "create", label: "AI content creation", text: "Ads made from a product photo or a product page." },
];

/** Tailwind classes per category: the icon square, the soft card tint and the label colour. */
export const TONE: Record<ToolCategory, { icon: string; soft: string; text: string; ring: string; dot: string }> = {
  translate: { icon: "bg-tone-translate-soft text-tone-translate", soft: "bg-tone-translate-soft", text: "text-tone-translate", ring: "hover:border-tone-translate/40", dot: "bg-tone-translate" },
  edit: { icon: "bg-tone-edit-soft text-tone-edit", soft: "bg-tone-edit-soft", text: "text-tone-edit", ring: "hover:border-tone-edit/40", dot: "bg-tone-edit" },
  enhance: { icon: "bg-tone-enhance-soft text-tone-enhance", soft: "bg-tone-enhance-soft", text: "text-tone-enhance", ring: "hover:border-tone-enhance/40", dot: "bg-tone-enhance" },
  create: { icon: "bg-tone-create-soft text-tone-create", soft: "bg-tone-create-soft", text: "text-tone-create", ring: "hover:border-tone-create/40", dot: "bg-tone-create" },
};

const TRANSLATE_TOOLS: Tool[] = [
  { key: "translate", href: "/app/translate", label: "Translate a video", text: "Your video in other languages, in the speaker's own voice with matching lips.", icon: Languages, category: "translate", chips: ["Lip sync", "190 languages", "Captions", "Remove on-screen text"] },
  { key: "presenter", href: "/app/translate?speaker=presenter", label: "Translate with a presenter", text: "Your words, translated and spoken by an AI presenter with the voice you pick.", icon: UserRoundPen, category: "translate", chips: ["AI presenter", "Voice and accent", "Captions"] },
];

const EDIT_TOOLS: Tool[] = [
  { key: "editor", href: "/app/edit", label: "Video editor", text: "Trim and cut a finished video, edit its captions, add text, a call to action and your logo.", icon: Scissors, category: "edit", chips: ["Trim and cut", "Edit captions", "Caption styles", "Text and logo"] },
  { key: "captions", href: "/app/tools/captions", label: "Add captions", text: "Captions of what is said, in the language of the video, in the style you pick.", icon: Captions, category: "edit", chips: ["Any video", "Caption styles", "9:16 or original"], isNew: true },
  { key: "remove-text", href: "/app/tools/remove-text", label: "Remove on-screen text", text: "Take old captions, titles and stickers out of a video; the sound stays as it was.", icon: Eraser, category: "edit", chips: ["Old captions", "Titles", "Sound kept"], isNew: true },
  { key: "transcribe", href: "/app/tools/transcribe", label: "Video to text", text: "Everything that is said in a video, as text and as a subtitle file.", icon: FileText, category: "edit", chips: ["Text file", "SRT subtitles", "Any spoken language"], isNew: true },
  { key: "resize", href: "/app/tools/resize", label: "Resize to 9:16", text: "A landscape or square video as a vertical video for Reels, TikTok and Shorts.", icon: RectangleVertical, category: "edit", chips: ["1080 × 1920", "Fill or whole picture"], isNew: true },
];

const ENHANCE_TOOLS: Tool[] = [
  { key: "enhance-video", href: "/app/enhance?type=video", label: "Enhance a video", text: "Upscale a video to 1080p or 4K, with less noise and sharper detail.", icon: Wand2, category: "enhance", chips: ["Up to 4K", "Less noise", "Sharper"], isNew: true },
  { key: "enhance-image", href: "/app/enhance?type=image", label: "Enhance an image", text: "Upscale a product photo two or four times, sharper and cleaner.", icon: Sparkles, category: "enhance", chips: ["2× or 4×", "Sharper", "Faces kept natural"], isNew: true },
  { key: "remove-background", href: "/app/tools/remove-background", label: "Remove background", text: "A product photo on a transparent background, ready for your shop or an ad.", icon: Wallpaper, category: "enhance", chips: ["Transparent PNG", "Product photos"], isNew: true },
];

const AD_TOOLS: Tool[] = [
  { key: "ad", href: "/app/new/ad", label: "Ad from a photo", text: "A product photo and a few sentences become a 9:16 ad with a presenter and captions.", icon: ImageUp, category: "create" },
  { key: "url", href: "/app/new/url", label: "Ad from a link", text: "Paste a product page; name, description and photos fill the ad form for you to check.", icon: Link2, category: "create" },
];

/** Every working tool, in category order. */
export const STUDIO_TOOLS: Tool[] = [...TRANSLATE_TOOLS, ...EDIT_TOOLS, ...ENHANCE_TOOLS, ...(config.features.ads ? AD_TOOLS : [])];

/** The tools that also get a row in the sidebar (25 Nov 2026: nine rows were too many); the rest live on All tools and in the search. */
export const SIDEBAR_TOOL_KEYS = ["translate", "presenter", "editor", "enhance-video", "enhance-image"];
export const SIDEBAR_TOOLS: Tool[] = STUDIO_TOOLS.filter((t) => SIDEBAR_TOOL_KEYS.includes(t.key));

/** Announced tools: the two ad tools while `config.features.ads` is off. */
export const SOON_TOOLS: Tool[] = config.features.ads ? [] : AD_TOOLS.map((t) => ({ ...t, soon: true }));

/** All tools, working and announced, for the All tools page and the search. */
export const ALL_TOOLS: Tool[] = [...STUDIO_TOOLS, ...SOON_TOOLS];

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
