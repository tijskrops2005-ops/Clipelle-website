import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { requireScope } from "@/lib/auth";
import { assets, db, projects, translations } from "@/lib/db";
import { dataErrorResponse } from "@/lib/data/server";
import { signedDownloadUrl } from "@/lib/storage";
import { safeZipName, zipStream, type ZipEntry } from "@/lib/zip";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

/** Finished videos of up to 25 selected projects, at most 1 GB together, as one stored ZIP. */
export const MAX_ZIP_PROJECTS = 25;
export const MAX_ZIP_BYTES = 1024 * 1024 * 1024;

const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX_ZIP_PROJECTS) });

export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireScope();
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: `Pick 1 to ${MAX_ZIP_PROJECTS} projects.` }, { status: 400 });
    const rows = await db().select().from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), inArray(projects.id, parsed.data.ids), eq(projects.status, "completed")));
    const files: { name: string; assetId: string }[] = [];
    for (const row of rows) {
      if (row.workflow === "ad" && row.finalAssetId) files.push({ name: row.name, assetId: row.finalAssetId });
      if (row.workflow === "translate") {
        const ts = await db().select().from(translations).where(eq(translations.projectId, row.id));
        for (const t of ts) {
          const id = t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId;
          if (t.status === "completed" && id) files.push({ name: `${row.name} - ${t.language}`, assetId: id });
        }
      }
    }
    if (files.length === 0) return Response.json({ error: "None of the selected projects has a finished video yet." }, { status: 409 });
    const assetRows = await db().select().from(assets).where(inArray(assets.id, files.map((f) => f.assetId)));
    const byId = new Map(assetRows.map((a) => [a.id, a]));
    const total = files.reduce((n, f) => n + (byId.get(f.assetId)?.bytes ?? 0), 0);
    if (total > MAX_ZIP_BYTES) return Response.json({ error: `These videos are ${(total / 1e9).toFixed(1)} GB together; a ZIP can hold 1 GB. Select fewer projects.` }, { status: 413 });
    const taken = new Set<string>();
    const entries: ZipEntry[] = [];
    for (const f of files) {
      const asset = byId.get(f.assetId);
      if (!asset) continue;
      const url = await signedDownloadUrl(asset.storagePath, 900);
      entries.push({
        name: safeZipName(f.name, taken),
        size: asset.bytes,
        data: (async function* () {
          const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(180_000) });
          if (!res.ok || !res.body) throw new Error(`Could not read ${f.name} (${res.status}).`);
          const reader = res.body.getReader();
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) yield value;
          }
        })(),
      });
    }
    const iterator = zipStream(entries);
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel() {
        void iterator.return(undefined);
      },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(stream, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="clipelle-videos-${stamp}.zip"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
