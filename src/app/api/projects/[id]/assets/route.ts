import { attachUploadedAsset, dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";
import { isUploadKind } from "@/lib/data/uploads";

/** Registers a file the browser uploaded with a signed URL (before the project starts). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<{ kind?: string; storagePath?: string; fileName?: string; seconds?: number }>(request);
  if (!body?.storagePath || !body.fileName || !isUploadKind(body.kind)) {
    return Response.json({ error: "kind (image|source|background|logo), storagePath and fileName are required." }, { status: 400 });
  }
  try {
    const asset = await attachUploadedAsset(id, { kind: body.kind, storagePath: body.storagePath, fileName: body.fileName, seconds: body.seconds });
    return Response.json({ id: asset.id, kind: asset.kind, bytes: asset.bytes }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
