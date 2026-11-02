import { config } from "@/lib/config";
import { dataErrorResponse, DataError } from "@/lib/data/server";
import { createSignedUpload, deleteObject, isStagedPathOf, MAX_OBJECT_BYTES, stagedPath, BUCKET } from "@/lib/storage";
import { isUploadKind } from "@/lib/data/uploads";
import { databaseModeOnly, readJson } from "../../projects/_guard";
import { requireScope } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * Staged upload (2 Nov 2026): a signed upload for a file the customer just picked on a creation form,
 * before the project exists, so the form draft can point at the stored file after a refresh. The
 * file sits under users/<id>/staged/ until the project attaches it (copied in, staged copy removed)
 * or the customer removes it (DELETE). Same limits and types as the project upload.
 */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ kind?: string; fileName?: string; bytes?: number; mime?: string }>(request);
  if (!body?.fileName || !isUploadKind(body.kind)) return Response.json({ error: "kind (image|source|background|logo) and fileName are required." }, { status: 400 });
  try {
    const scope = await requireScope();
    const limit = await rateLimit(`stage:${scope.userId}`, 60, 60 * 60 * 1000);
    if (!limit.ok) throw new DataError("Too many uploads in a short time. Try again in a little while.", 429, "rate_limited");
    const bytes = Number(body.bytes ?? 0);
    const maxBytes = body.kind === "source" ? config.limits.translateVideoMaxMb * 1024 * 1024 : 10 * 1024 * 1024;
    if (bytes > Math.min(maxBytes, MAX_OBJECT_BYTES)) {
      throw new DataError(`This file is ${(bytes / 1e6).toFixed(1)} MB; the limit is ${Math.round(Math.min(maxBytes, MAX_OBJECT_BYTES) / 1e6)} MB.`, 413, "too_large");
    }
    const allowed = body.kind === "source" ? VIDEO_TYPES : IMAGE_TYPES;
    if (body.mime && !allowed.includes(body.mime)) throw new DataError(`File type ${body.mime} is not supported here.`, 415, "bad_type");
    const path = stagedPath(scope.userId, body.fileName);
    const signed = await createSignedUpload(path);
    return Response.json({ path: signed.path, token: signed.token, bucket: BUCKET, ...(signed.direct ? { url: signed.signedUrl } : {}) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

/** Removes a staged file the customer no longer wants (own folder only; a missing file is fine). */
export async function DELETE(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const body = await readJson<{ path?: string }>(request);
  if (!body?.path) return Response.json({ error: "path is required." }, { status: 400 });
  try {
    const scope = await requireScope();
    if (!isStagedPathOf(body.path, scope.userId)) throw new DataError("Not a staged file of yours.", 400, "bad_path");
    await deleteObject(body.path).catch(() => null);
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
