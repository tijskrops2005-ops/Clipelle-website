import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanText, parseProductPage } from "./productPage";

const fixture = (name: string) => readFileSync(`src/test/fixtures/product-pages/${name}`, "utf8");

describe("product page parser", () => {
  it("prefers JSON-LD product data and resolves images", () => {
    const d = parseProductPage(fixture("jsonld-shop.html"), "https://shop.example.test/products/nimbus-750?utm=1");
    expect(d.source).toBe("json-ld");
    expect(d.name).toBe("Nimbus 750 ml insulated bottle");
    expect(d.description).toContain("cold for 24 hours");
    expect(d.description).toContain("holder & weighs");
    expect(d.brand).toBe("Nimbus");
    expect(d.price).toBe("34.90 EUR");
    expect(d.canonicalUrl).toBe("https://shop.example.test/products/nimbus-750");
    expect(d.images.slice(0, 3)).toEqual(["https://cdn.example.test/nimbus/front.jpg", "https://cdn.example.test/nimbus/side.jpg", "https://shop.example.test/images/nimbus-og.jpg"]);
    expect(d.images).toContain("https://shop.example.test/images/gallery/nimbus-3.jpg");
    expect(d.images.some((i) => i.includes("logo.svg"))).toBe(false);
  });

  it("falls back to Open Graph and meta tags", () => {
    const d = parseProductPage(fixture("og-only.html"), "https://fashion.example.test/p/loop");
    expect(d.source).toBe("open-graph");
    expect(d.name).toBe("Loop long-sleeve dress");
    expect(d.description).toContain("side pockets. Machine washable at 30°");
    expect(d.images).toEqual(["https://img.example.test/loop/1.jpg", "https://img.example.test/loop/2.jpg"]);
    expect(d.price).toBe("59 EUR");
    expect(d.brand).toBe("Example Fashion");
  });

  it("uses the heading, the title and large images on a page without structured data", () => {
    const d = parseProductPage(fixture("minimal.html"), "https://lamps.example.test/tiny");
    expect(d.source).toBe("page");
    expect(d.name).toBe("Tiny lamp with a warm glow");
    expect(d.description).toBeUndefined();
    expect(d.images).toEqual(["https://lamps.example.test/photos/tiny-lamp-main.jpg", "https://lamps.example.test/photos/tiny-lamp-detail.jpg"]);
  });

  it("cleans text: tags out, entities decoded, cut at a sentence", () => {
    expect(cleanText("<b>Soft</b> &amp; warm&nbsp;&#8211; really", 100)).toBe("Soft & warm – really");
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const cut = cleanText(long, 200)!;
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith(".")).toBe(true);
  });
});
