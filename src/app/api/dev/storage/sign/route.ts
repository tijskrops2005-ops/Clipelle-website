import { createSignedUpload, MAX_OBJECT_BYTES, objectPath, BUCKET } from "@/lib/storage";
import { devOnly, errorResponse } from "../../_guard";

/** Free: a signed upload URL for the test page (the browser uploads straight to storage). */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: { fileName?: string; bytes?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.fileName) return Response.json({ error: "fileName is required." }, { status: 400 });
  if (typeof body.bytes === "number" && body.bytes > MAX_OBJECT_BYTES) {
    return Response.json({ error: `Files up to ${MAX_OBJECT_BYTES / 1e6} MB only.` }, { status: 413 });
  }
  try {
    const path = objectPath({ projectId: "dev", kind: "upload-test", fileName: body.fileName });
    return Response.json(await createSignedUpload(path));
  } catch (error) {
    return errorResponse(error);
  }
}
