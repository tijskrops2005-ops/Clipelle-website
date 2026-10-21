import { objectInfo, objectPath, putObject } from "@/lib/storage";
import { attachUploadedAsset } from "@/lib/data/server";
import { fetchPublicResource } from "@/lib/safeUrl";
import { ApiError } from "@/lib/api/v1";
import type { UploadKind } from "@/lib/data/uploads";

/** Downloads a public file the API caller named and attaches it to a draft project as if the browser had uploaded it. */
export async function attachFromUrl(userId: string, projectId: string, kind: UploadKind, url: string, options: { accept: "image" | "video"; maxBytes: number; seconds?: number }) {
  const file = await fetchPublicResource(url, { accept: options.accept, maxBytes: options.maxBytes, timeoutMs: 20_000, maxRedirects: 3 });
  const b = file.bytes;
  if (options.accept === "image") {
    const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    const isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isWebp = b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    if (!isPng && !isJpg && !isWebp) throw new ApiError("validation_error", `The image at ${url} is not a PNG, JPG or WebP file.`, 400);
  }
  const name = (() => {
    try {
      return decodeURIComponent(new URL(file.url).pathname.split("/").pop() || "") || `${kind}.bin`;
    } catch {
      return `${kind}.bin`;
    }
  })();
  const path = objectPath({ projectId, kind, fileName: name });
  await putObject(path, b, file.contentType === "application/octet-stream" ? "video/mp4" : file.contentType);
  if (!(await objectInfo(path))) throw new ApiError("server_error", "The file could not be stored.", 500);
  return attachUploadedAsset(userId, projectId, { kind, storagePath: path, fileName: name, seconds: options.seconds });
}
