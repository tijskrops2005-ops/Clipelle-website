import { describe, expect, it } from "vitest";
import { assertPublicHost, fetchPublicResource, isPrivateIp, parsePublicUrl, UrlError } from "./safeUrl";

const publicLookup = async () => ["93.184.216.34"];

describe("safe URL rules", () => {
  it("accepts only full http(s) links without credentials", () => {
    expect(parsePublicUrl(" https://shop.example.com/p/1#top ").toString()).toBe("https://shop.example.com/p/1");
    for (const bad of ["shop.example.com", "ftp://shop.example.com/x", "file:///etc/passwd", "javascript:alert(1)", "https://user:pw@shop.example.com/", "http://localhost:3001/", "http://intranet/", "http://db.local/", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://10.0.0.8/", "http://192.168.1.1/", "http://172.20.0.1/"]) {
      expect(() => parsePublicUrl(bad), bad).toThrow(UrlError);
    }
  });

  it("knows the private ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "169.254.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fe80::1", "fc00::1", "fd12::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "2001:db8::1"]) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateIp(ip), ip).toBe(false);
  });

  it("refuses a public name that resolves to a private address", async () => {
    await expect(assertPublicHost(new URL("https://evil.example.com/"), async () => ["10.0.0.5"])).rejects.toMatchObject({ code: "private_ip" });
    await expect(assertPublicHost(new URL("https://evil.example.com/"), async () => ["93.184.216.34", "127.0.0.1"])).rejects.toMatchObject({ code: "private_ip" });
    await expect(assertPublicHost(new URL("https://nowhere.example.com/"), async () => [])).rejects.toMatchObject({ code: "dns" });
    await expect(assertPublicHost(new URL("https://ok.example.com/"), publicLookup)).resolves.toBeUndefined();
  });

  it("follows a few redirects, checks every hop and refuses a hop inside", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: URL | RequestInfo) => {
      const u = url.toString();
      calls.push(u);
      if (u === "https://a.example.com/") return new Response(null, { status: 302, headers: { location: "/b" } });
      if (u === "https://a.example.com/b") return new Response(null, { status: 301, headers: { location: "http://127.0.0.1/admin" } });
      return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    }) as typeof fetch;
    await expect(fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl })).rejects.toMatchObject({ code: "private_ip" });
    expect(calls).toEqual(["https://a.example.com/", "https://a.example.com/b"]);
  });

  it("stops at the redirect limit, the size cap and a wrong content type", async () => {
    const loop = (async () => new Response(null, { status: 302, headers: { location: "https://a.example.com/again" } })) as typeof fetch;
    await expect(fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl: loop, maxRedirects: 2 })).rejects.toMatchObject({ code: "redirects" });
    const big = (async () => new Response("x".repeat(5000), { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    await expect(fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl: big, maxBytes: 1000 })).rejects.toMatchObject({ code: "too_large" });
    const pdf = (async () => new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } })) as typeof fetch;
    await expect(fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl: pdf })).rejects.toMatchObject({ code: "content_type" });
    const html = (async () => new Response("<html><title>ok</title></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } })) as typeof fetch;
    const got = await fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl: html });
    expect(got.contentType).toBe("text/html");
    expect(new TextDecoder().decode(got.bytes)).toContain("ok");
  });

  it("sends no cookies and a plain user agent", async () => {
    let init: RequestInit | undefined;
    const fetchImpl = (async (_u: URL | RequestInfo, i?: RequestInit) => {
      init = i;
      return new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    }) as typeof fetch;
    await fetchPublicResource("https://a.example.com/", { accept: "html", lookup: publicLookup, fetchImpl });
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("manual");
    const headers = init?.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("cookie");
    expect(headers["User-Agent"]).toContain("ClipelleBot");
  });
});
