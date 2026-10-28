import "server-only";
import { getRender, startRender, type ShotstackEdit } from "@/lib/services/finalEdit";

/**
 * One frame of a video at an exact moment, as a JPG (28 Oct 2026). fal's extract-frame only knows
 * first/middle/last, and for some uploads its "last" frame came back as the first one; Shotstack
 * renders a 0.2 s timeline that starts at the moment as an image (`output.format: "jpg"`, the first
 * frame of the timeline; billed per second rounded down, so close to nothing). `fit: "contain"`
 * shows the whole frame (to compare framing with the original), `crop` fills 9:16.
 */
export function buildFrameEdit(videoUrl: string, at: number, fit: "crop" | "contain"): ShotstackEdit {
  return {
    timeline: { background: "#000000", tracks: [{ clips: [{ asset: { type: "video", src: videoUrl, volume: 0, trim: Math.max(0, Math.round(at * 100) / 100) }, start: 0, length: 0.2, fit }] }] },
    output: { format: "jpg", size: { width: 360, height: 640 } },
    meta: { totalSeconds: 0.2 },
  };
}

/** Renders the frames in parallel and waits for them (up to 90 s); a frame that fails is null. */
export async function framesAt(videoUrl: string, moments: number[], fit: "crop" | "contain"): Promise<(string | null)[]> {
  const renders = await Promise.all(moments.map((at) => startRender(buildFrameEdit(videoUrl, at, fit)).then((r) => r.renderId).catch(() => null)));
  const out: (string | null)[] = renders.map(() => null);
  const until = Date.now() + 90_000;
  while (Date.now() < until && renders.some((id, i) => id && out[i] === null)) {
    await new Promise((r) => setTimeout(r, 2500));
    await Promise.all(
      renders.map(async (id, i) => {
        if (!id || out[i] !== null) return;
        const x = await getRender(id).catch(() => null);
        if (x?.status === "done" && x.url) out[i] = x.url;
        if (x?.status === "failed") renders[i] = null;
      }),
    );
  }
  return out;
}

/** Estimate for the cost guard: 0.2 s per frame at the edit rate, rounded up to a tenth of a cent. */
export const FRAME_AT_USD = 0.001;
