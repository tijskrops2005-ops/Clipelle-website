/**
 * Turns a URL the browser may read (a signed storage URL, a data URL, an object URL) into a File,
 * so a form can start with files exactly as if the customer had dropped them in. Null on failure.
 */
export async function fetchAsFile(url: string, baseName: string): Promise<File | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const blob = await r.blob();
    const type = blob.type || "application/octet-stream";
    const ext = type === "image/png" ? "png" : type === "image/svg+xml" ? "svg" : type === "image/webp" ? "webp" : type.startsWith("video/") ? "mp4" : "jpg";
    return new File([blob], `${baseName}.${ext}`, { type });
  } catch {
    return null;
  }
}
