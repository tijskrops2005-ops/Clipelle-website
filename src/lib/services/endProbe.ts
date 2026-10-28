import "server-only";
import sharp from "sharp";
import type { ShotstackEdit } from "@/lib/services/finalEdit";

/**
 * The silent end of a translation as a tiny GIF (28 Oct 2026), to tell dead air (cut it) from an end
 * card or outro (keep it): rendered by Shotstack (`output.format: "gif"`, custom `size`, `fps` 12;
 * billed per second of output, rounded down; docs and pricing read 28 Oct 2026), then read here frame
 * by frame with sharp as small greyscale grids for src/lib/sceneCut.ts.
 */

export const END_PROBE_FPS = 12;

export function buildEndProbeEdit(input: { videoUrl: string; from: number; length: number }): ShotstackEdit {
  const length = Math.round(input.length * 10) / 10;
  return {
    timeline: { background: "#000000", tracks: [{ clips: [{ asset: { type: "video", src: input.videoUrl, volume: 0, trim: Math.round(input.from * 100) / 100 }, start: 0, length, fit: "crop" }] }] },
    output: { format: "gif", size: { width: 48, height: 86 }, fps: END_PROBE_FPS },
    meta: { totalSeconds: length },
  };
}

/** Every frame of a GIF as a 24×42 greyscale grid. */
export async function gifFrames(url: string): Promise<Uint8Array[]> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Could not download the end preview (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { pages = 1 } = await sharp(buf, { animated: true }).metadata();
  const frames: Uint8Array[] = [];
  for (let i = 0; i < Math.min(pages, 200); i++) {
    frames.push(new Uint8Array(await sharp(buf, { page: i }).resize(24, 42, { fit: "fill" }).greyscale().raw().toBuffer()));
  }
  return frames;
}
