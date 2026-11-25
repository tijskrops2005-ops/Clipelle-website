import { connection } from "next/server";
import { requireScope } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { parseFrom, resolveSource } from "@/lib/data/enhance";
import { signedDownloadUrl } from "@/lib/storage";
import { databaseModeOnly } from "../projects/_guard";

/** What a stored source is (25 Nov 2026, tools linked together): name, kind, size, length and a preview link. */
export async function GET(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  await connection();
  const ref = parseFrom(new URL(request.url).searchParams.get("from"));
  if (!ref) return Response.json({ error: "Unknown source." }, { status: 400 });
  try {
    const scope = await requireScope();
    const source = await resolveSource(scope, ref);
    if (!source) return Response.json({ error: "That file is not available any more." }, { status: 404 });
    return Response.json({ fileName: source.fileName, media: source.media, seconds: source.seconds, width: source.width, height: source.height, previewUrl: await signedDownloadUrl(source.path, 3600) });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
