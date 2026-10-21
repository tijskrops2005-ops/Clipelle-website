/**
 * Reads the product facts out of a product page's HTML: JSON-LD (schema.org Product) first,
 * then Open Graph and plain meta tags, then the title and the first heading. Pure and
 * browser-safe: no network, no AI. The customer checks and edits the result on /new/url before
 * anything is used.
 */
export type ProductPageData = {
  name?: string;
  description?: string;
  /** Absolute image URLs, best first, at most MAX_IMAGES. Nothing is downloaded here. */
  images: string[];
  brand?: string;
  price?: string;
  canonicalUrl?: string;
  /** Where each field came from, for the preview ("from the page's product data"). */
  source: "json-ld" | "open-graph" | "page" | "none";
};

export const MAX_IMAGES = 6;
const MAX_DESCRIPTION = 600;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", euro: "€", pound: "£", copy: "©", reg: "®", trade: "™", deg: "°", times: "×", laquo: "«", raquo: "»", bull: "•", middot: "·" };

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Tags out, entities decoded, whitespace collapsed, length capped at a sentence end when possible. */
export function cleanText(raw: string | undefined, max = MAX_DESCRIPTION): string | undefined {
  if (!raw) return undefined;
  const text = decodeEntities(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut).trim();
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

/** All <meta> tags as {property|name → content}, first occurrence wins, keys lower-cased. */
function metaMap(html: string) {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") ?? attr(tag, "name") ?? attr(tag, "itemprop"))?.toLowerCase();
    const content = attr(tag, "content");
    if (key && content !== undefined && !out.has(key)) out.set(key, decodeEntities(content));
  }
  return out;
}

function absolute(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

type Json = Record<string, unknown>;

/** Every JSON-LD object on the page, flattened through @graph and arrays. */
function jsonLdObjects(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        const o = v as Json;
        out.push(o);
        if (Array.isArray(o["@graph"])) walk(o["@graph"]);
      }
    };
    walk(parsed);
  }
  return out;
}

function isProduct(o: Json) {
  const t = o["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /product/i.test(x));
}

function stringOf(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    const o = v as Json;
    return stringOf(o.name ?? o["@value"] ?? o.url ?? o.contentUrl);
  }
  return undefined;
}

function imagesOf(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(imagesOf);
  if (typeof v === "string") return [v];
  if (typeof v === "object") {
    const o = v as Json;
    return [stringOf(o.contentUrl ?? o.url)].filter((x): x is string => Boolean(x));
  }
  return [];
}

function priceOf(o: Json): string | undefined {
  const offers = o.offers;
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const x = offer as Json;
    const price = stringOf(x.price ?? x.lowPrice);
    const currency = stringOf(x.priceCurrency);
    if (price) return currency ? `${price} ${currency}` : price;
  }
  return undefined;
}

export function parseProductPage(html: string, pageUrl: string): ProductPageData {
  const meta = metaMap(html);
  const canonical = absolute(attr(html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] ?? "", "href") ?? meta.get("og:url"), pageUrl);
  const images: string[] = [];
  const addImage = (u: string | undefined) => {
    const abs = absolute(u, pageUrl);
    if (abs && !images.includes(abs) && images.length < MAX_IMAGES) images.push(abs);
  };

  const product = jsonLdObjects(html).find(isProduct);
  let name: string | undefined;
  let description: string | undefined;
  let brand: string | undefined;
  let price: string | undefined;
  let source: ProductPageData["source"] = "none";
  if (product) {
    source = "json-ld";
    name = cleanText(stringOf(product.name), 140);
    description = cleanText(stringOf(product.description));
    brand = cleanText(stringOf(product.brand), 80);
    price = priceOf(product);
    imagesOf(product.image).forEach(addImage);
  }
  if (!name || !description) {
    const ogTitle = meta.get("og:title") ?? meta.get("twitter:title");
    const ogDesc = meta.get("og:description") ?? meta.get("description") ?? meta.get("twitter:description");
    if (ogTitle || ogDesc) {
      if (source === "none") source = "open-graph";
      name ??= cleanText(ogTitle, 140);
      description ??= cleanText(ogDesc);
    }
  }
  if (!name) {
    const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    name = cleanText(h1, 140) ?? cleanText(title?.split(/\s[|–—-]\s/)[0], 140);
    if (name && source === "none") source = "page";
  }
  for (const key of ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]) addImage(meta.get(key));
  if (images.length < MAX_IMAGES) {
    // Product galleries: large images near the top, by src or srcset; skip icons, logos and tracking pixels.
    for (const tag of (html.match(/<img\b[^>]*>/gi) ?? []).slice(0, 60)) {
      const src = attr(tag, "src") ?? attr(tag, "data-src") ?? attr(tag, "srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
      const w = Number(attr(tag, "width") ?? "0");
      if (!src || /logo|icon|sprite|pixel|badge|avatar|flag|\.svg(\?|$)|data:/i.test(src) || (w > 0 && w < 200)) continue;
      addImage(src);
      if (images.length >= MAX_IMAGES) break;
    }
  }
  price ??= meta.get("product:price:amount") ? `${meta.get("product:price:amount")} ${meta.get("product:price:currency") ?? ""}`.trim() : undefined;
  brand ??= cleanText(meta.get("product:brand") ?? meta.get("og:site_name"), 80);
  return { name, description, images, brand, price, canonicalUrl: canonical, source };
}
