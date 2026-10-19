import { attachUploadedAsset, dataErrorResponse } from "@/lib/data/server";
import { databaseModeOnly, readJson } from "../../_guard";

/** Registers a file the browser uploaded with a signed URL (before the project starts). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const body = await readJson<{ kind?: "image" | "source"; storagePath?: string; fileName?: string; seconds?: number }>(request);
  if (!body?.storagePath || !body.fileName || (body.kind !== "image" && body.kind !== "source")) {
    return Response.json({ error: "kind (image|source), storagePath and fileName are required." }, { status: 400 });
  }
  try {
    const asset = await attachUploadedAsset(id, { kind: body.kind, storagePath: body.storagePath, fileName: body.fileName, seconds: body.seconds });
    return Response.json({ id: asset.id, kind: asset.kind, bytes: asset.bytes }, { status: 201 });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
