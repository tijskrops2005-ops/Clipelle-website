import { HEYGEN_ASSET_MAX_BYTES, uploadHeygenAsset } from "@/lib/services/translate";
import { devOnly, errorResponse, requireRights } from "../_guard";

/** Uploads the source video to HeyGen as an asset (free). Multipart: file, rightsConfirmed. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the video as multipart form data." }, { status: 400 });
  }
  const rights = requireRights(form.get("rightsConfirmed"));
  if (rights) return rights;

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Add a video file." }, { status: 400 });
  if (file.size > HEYGEN_ASSET_MAX_BYTES) {
    return Response.json(
      { error: `This video is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Right now we accept videos up to 32 MB. Trim it or export it at a lower bitrate.`, code: "file_too_large" },
      { status: 413 },
    );
  }
  try {
    const asset = await uploadHeygenAsset({ file, filename: file.name || "source.mp4" });
    return Response.json({ assetId: asset.asset_id, url: asset.url, mimeType: asset.mime_type, sizeBytes: asset.size_bytes ?? file.size });
  } catch (error) {
    return errorResponse(error);
  }
}
