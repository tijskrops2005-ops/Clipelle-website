import { config } from "@/lib/config";
import { dataErrorResponse, DataError, getProjectRow } from "@/lib/data/server";
import { createSignedUpload, MAX_OBJECT_BYTES, objectPath, BUCKET } from "@/lib/storage";
import { isUploadKind } from "@/lib/data/uploads";
import { databaseModeOnly, readJson } from "../../projects/_guard";
import { requireScope } from "@/lib/auth";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * Signed upload URL for a draft project's file. The browser then PUTs the bytes straight
 * to storage; our server never handles them (Vercel's 4.5 MB body limit does not apply).
 */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ projectId?: string; kind?: string; fileName?: string; bytes?: number; mime?: string }>(request);
  if (!body?.projectId || !body.fileName || !isUploadKind(body.kind)) {
    return Response.json({ error: "projectId, kind (image|source|background|logo) and fileName are required." }, { status: 400 });
  }
  try {
    const scope = await requireScope();
    const row = await getProjectRow(body.projectId, scope);
    if (!row) throw new DataError("Project not found.", 404, "not_found");
    if (row.status !== "draft") throw new DataError("Files can only be added before the project starts.", 409, "not_draft");
    const bytes = Number(body.bytes ?? 0);
    const maxBytes = body.kind === "source" ? config.limits.translateVideoMaxMb * 1024 * 1024 : 10 * 1024 * 1024;
    if (bytes > Math.min(maxBytes, MAX_OBJECT_BYTES)) {
      throw new DataError(`This file is ${(bytes / 1e6).toFixed(1)} MB; the limit is ${Math.round(Math.min(maxBytes, MAX_OBJECT_BYTES) / 1e6)} MB.`, 413, "too_large");
    }
    const allowed = body.kind === "source" ? VIDEO_TYPES : IMAGE_TYPES;
    if (body.mime && !allowed.includes(body.mime)) throw new DataError(`File type ${body.mime} is not supported here.`, 415, "bad_type");
    const path = objectPath({ projectId: row.id, kind: body.kind, fileName: body.fileName });
    const signed = await createSignedUpload(path);
    return Response.json({ path: signed.path, token: signed.token, bucket: BUCKET });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
