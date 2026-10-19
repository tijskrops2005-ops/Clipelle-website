import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildAdEdit, shotstackEnv, startRender, uploadAsset } from "@/lib/services/finalEdit";
import { costGuardResponse, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { devOnly, errorResponse } from "../../_guard";
import { nearestAdLength } from "@/lib/pricing";

/** Shotstack pay-as-you-go: $10 per 50 minutes of output = $0.20 per minute. */
const SHOTSTACK_USD_PER_MINUTE = 0.2;

type Body = {
  presenterUrl?: string;
  productClipUrl?: string;
  musicUrl?: string;
  presenterSeconds?: number;
  /** Chosen ad length; a shorter presenter clip is repeated to reach it (sandbox check of the layout). */
  seconds?: number;
  confirmed?: boolean;
};

async function demoAsset(file: string, contentType: string) {
  const data = await readFile(path.join(process.cwd(), "public", "demo", file));
  return uploadAsset(`demo:${file}:${data.length}`, data, contentType);
}

/** Sandbox renders are free (watermarked); production renders need an explicit confirmation. */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const env = shotstackEnv();
  if (env === "v1" && body.confirmed !== true) {
    return Response.json({ error: "Production render requires confirmation (it costs credits)." }, { status: 400 });
  }
  const seconds = nearestAdLength(Number(body.seconds) || 30);

  try {
    const started = Date.now();
    // Assets: public URLs from earlier steps, or the demo files (uploaded through the Ingest API).
    const presenter = body.presenterUrl?.trim()
      ? { url: body.presenterUrl.trim(), duration: body.presenterSeconds }
      : await demoAsset("sample-presenter.mp4", "video/mp4");
    const product = body.productClipUrl?.trim()
      ? { url: body.productClipUrl.trim(), duration: 8 }
      : await demoAsset("sample-video.mp4", "video/mp4");
    const music = body.musicUrl?.trim() ? { url: body.musicUrl.trim() } : await demoAsset("sample-music.mp3", "audio/mpeg");

    const presenterSeconds = Math.max(1, Math.round((presenter.duration ?? body.presenterSeconds ?? 8) * 10) / 10);
    const edit = buildAdEdit({
      presenterUrl: presenter.url,
      presenterSeconds,
      productClipUrl: product.url,
      productClipSeconds: product.duration ?? 8,
      musicUrl: music.url,
      fillToSeconds: seconds,
    });
    // Production renders cost credits: run them through the cost guard. Sandbox renders are free.
    let entryId = "";
    const estimateUsd = env === "v1" ? Math.round((edit.meta.totalSeconds / 60) * SHOTSTACK_USD_PER_MINUTE * 1000) / 1000 : 0;
    if (env === "v1") {
      try {
        const reserved = await reserveSpend({
          service: "shotstack",
          action: "render",
          estimatedUsd: estimateUsd,
          fingerprintInput: { seconds, presenter: presenter.url, product: product.url, music: music.url },
          meta: { totalSeconds: edit.meta.totalSeconds, seconds },
        });
        entryId = reserved.entryId;
      } catch (error) {
        const refused = costGuardResponse(error);
        if (refused) return refused;
        throw error;
      }
    }

    let render;
    try {
      render = await startRender(edit);
    } catch (error) {
      if (entryId) await settleSpend(entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
    return Response.json({
      ...render,
      edit: { timeline: edit.timeline, output: edit.output },
      meta: edit.meta,
      assets: { presenter: presenter.url, product: product.url, music: music.url, presenterSeconds },
      estimateUsd,
      entryId,
      uploadMs: Date.now() - started,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
