import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

/**
 * Fetching a page the customer pasted, safely: only http(s), no credentials, no private or
 * internal addresses (also after DNS and after every redirect), a size cap, a time limit, a
 * small number of redirects, no cookies, a plain user agent. Server-only by nature (DNS).
 */
export class UrlError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = "UrlError";
  }
}

export type Lookup = (host: string) => Promise<string[]>;

export const defaultLookup: Lookup = async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((r) => r.address);

/** Parses and checks the shape of a URL a person typed. Throws UrlError with a plain message. */
export function parsePublicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new UrlError("Enter a full link that starts with http:// or https://.", "invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UrlError("Only http and https links can be read.", "scheme");
  if (url.username || url.password) throw new UrlError("Links with a user name or password are not accepted.", "credentials");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa") || !host.includes(".") && !isIP(host)) {
    throw new UrlError("That address is not a public website.", "private_host");
  }
  if (isIP(host) && isPrivateIp(host)) throw new UrlError("That address is not a public website.", "private_ip");
  url.hash = "";
  return url;
}

/** True for loopback, link-local, private, carrier-grade NAT, multicast, unspecified and mapped ranges. */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return privateV4(ip);
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/) ?? lower.match(/::ffff:([0-9a-f]+):([0-9a-f]+)$/);
    if (mapped) {
      if (mapped[2]) {
        const a = parseInt(mapped[1], 16);
        const b = parseInt(mapped[2], 16);
        return privateV4(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`);
      }
      return privateV4(mapped[1]);
    }
    if (/^fe[89ab]/.test(lower)) return true; // link-local
    if (/^f[cd]/.test(lower)) return true; // unique local
    if (/^ff/.test(lower)) return true; // multicast
    if (lower.startsWith("2001:db8")) return true; // documentation
    return false;
  }
  return true; // not an address at all
}

function privateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && p[2] === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

/** Resolves the host and refuses when any address is private: a public name must not lead inside. */
export async function assertPublicHost(url: URL, lookup: Lookup = defaultLookup) {
  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new UrlError("That address is not a public website.", "private_ip");
    return;
  }
  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    throw new UrlError("That website could not be found.", "dns", 422);
  }
  if (addresses.length === 0) throw new UrlError("That website could not be found.", "dns", 422);
  if (addresses.some(isPrivateIp)) throw new UrlError("That address is not a public website.", "private_ip");
}

export type FetchOptions = {
  lookup?: Lookup;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Accept header and the content-type family that is allowed back ("text/html" or "image/"). */
  accept: "html" | "image" | "video";
  fetchImpl?: typeof fetch;
};

export type FetchedResource = { url: string; contentType: string; bytes: Uint8Array };

/**
 * GET with the safety rules above. Redirects are followed by hand (at most `maxRedirects`), each
 * target checked again. The body is read in chunks and cut off at `maxBytes`.
 */
export async function fetchPublicResource(input: string, options: FetchOptions): Promise<FetchedResource> {
  const { lookup = defaultLookup, maxBytes = 2 * 1024 * 1024, timeoutMs = 8000, maxRedirects = 3, accept, fetchImpl = fetch } = options;
  let url = parsePublicUrl(input);
  const deadline = AbortSignal.timeout(timeoutMs);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHost(url, lookup);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        redirect: "manual",
        signal: deadline,
        cache: "no-store",
        credentials: "omit",
        headers: {
          Accept: accept === "html" ? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" : accept === "image" ? "image/*" : "video/*",
          "Accept-Language": "en",
          "User-Agent": "Mozilla/5.0 (compatible; ClipelleBot/1.0; product page reader)",
        },
      });
    } catch (e) {
      if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") throw new UrlError("That website took too long to answer.", "timeout", 504);
      throw new UrlError("That website could not be reached.", "unreachable", 502);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UrlError("That link redirects nowhere.", "redirect");
      if (hop === maxRedirects) throw new UrlError("That link redirects too many times.", "redirects");
      url = parsePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw new UrlError(`That website answered with an error (${res.status}).`, "http_error", 502);
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const okType = accept === "html" ? contentType === "text/html" || contentType === "application/xhtml+xml" : accept === "image" ? contentType.startsWith("image/") : contentType.startsWith("video/") || contentType === "application/octet-stream";
    if (!okType) throw new UrlError(accept === "html" ? "That link is not a web page." : accept === "image" ? "That link is not an image." : "That link is not a video file.", "content_type", 415);
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > maxBytes) throw new UrlError("That file is too large to read.", "too_large", 413);
    const bytes = await readCapped(res, maxBytes);
    return { url: url.toString(), contentType, bytes };
  }
  throw new UrlError("That link redirects too many times.", "redirects");
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new UrlError("That file is too large to read.", "too_large", 413);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
