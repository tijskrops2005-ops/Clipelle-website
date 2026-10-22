/** The public site's base URL for canonical links, sitemaps, feeds and JSON-LD. Browser-safe; defined in brand.ts. */
export { siteUrl } from "@/lib/brand";
import { siteUrl } from "@/lib/brand";

export function absoluteUrl(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
