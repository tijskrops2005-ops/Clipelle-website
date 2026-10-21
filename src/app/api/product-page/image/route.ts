import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { fetchPublicResource, UrlError } from "@/lib/safeUrl";
import { readJson } from "@/app/api/projects/_guard";

const Body = z.object({ url: z.string().trim().min(1).max(2000) });
/** Serverless responses stay well under the platform's body limit. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Downloads one product image the customer confirmed, with the same safety rules, and hands the bytes to the browser. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "No image link." }, { status: 400 });
    const limited = await rateLimit(`url_image:user:${user.id}`, 60, 10 * 60 * 1000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "image downloads");
    const img = await fetchPublicResource(parsed.data.url, { accept: "image", maxBytes: MAX_IMAGE_BYTES, timeoutMs: 10_000, maxRedirects: 3 });
    const b = img.bytes;
    const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    const isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isWebp = b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    if (!isPng && !isJpg && !isWebp) return Response.json({ error: "Only PNG, JPG and WebP photos can be used." }, { status: 415 });
    const type = isPng ? "image/png" : isJpg ? "image/jpeg" : "image/webp";
    return new Response(new Blob([b as BlobPart], { type }), { headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof UrlError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return dataErrorResponse(error);
  }
}
