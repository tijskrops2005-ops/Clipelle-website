import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { fetchPublicResource, UrlError } from "@/lib/safeUrl";
import { parseProductPage } from "@/lib/productPage";
import { adsEnabledOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.object({ url: z.string().trim().min(1).max(2000) });

/**
 * Reads a product page for the signed-in customer and returns name, description, images (as
 * URLs only) and price. No AI call, no cookies, no private addresses, 2 MB, 8 s, 3 redirects,
 * 20 pages per account per 10 minutes. Images are downloaded only after the customer confirms
 * (POST /api/product-page/image).
 */
export async function POST(request: Request) {
  const off = adsEnabledOnly();
  if (off) return off;
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Paste a product link." }, { status: 400 });
    const limited = await rateLimit(`url_fetch:user:${user.id}`, 20, 10 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "page reads");
    const page = await fetchPublicResource(parsed.data.url, { accept: "html", maxBytes: 2 * 1024 * 1024, timeoutMs: 8000, maxRedirects: 3 });
    const html = new TextDecoder("utf-8", { fatal: false }).decode(page.bytes);
    const data = parseProductPage(html, page.url);
    return Response.json({ ...data, pageUrl: page.url });
  } catch (error) {
    if (error instanceof UrlError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return dataErrorResponse(error);
  }
}
