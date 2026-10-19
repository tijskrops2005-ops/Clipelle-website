import { copyFromUrl, objectInfo, objectPath, signedDownloadUrl } from "@/lib/storage";
import { devOnly, errorResponse } from "../../_guard";

/** Free: copies a provider URL (e.g. a Shotstack sandbox render) into our storage and signs a download link. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: { url?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url || !/^https:\/\//.test(url)) return Response.json({ error: "A public https URL is required." }, { status: 400 });
  try {
    const started = Date.now();
    const path = objectPath({ projectId: "dev", kind: "copy-test", fileName: body.fileName?.trim() || "copied.mp4" });
    const stored = await copyFromUrl(url, path, "video/mp4");
    const info = await objectInfo(path);
    return Response.json({ ...stored, info, downloadUrl: await signedDownloadUrl(path, 3600), ms: Date.now() - started });
  } catch (error) {
    return errorResponse(error);
  }
}
