/**
 * Makes the before/after examples for the tool pages on the site (25 Nov 2026) with the real tools, on our
 * own sample videos from the examples bucket. Writes public/examples/tool-*.{jpg,png,mp4}; upload them with
 * `npm run examples:upload`. About $0.40 in provider costs per full run; a step whose file exists is skipped.
 *
 *   node --import tsx --conditions=react-server --env-file=.env.local scripts/make-tool-examples.mts
 */
import { existsSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { getBackgroundRemovalStatus, getToolEnhanceStatus, submitBackgroundRemoval, submitImageEnhance, submitVideoEnhance } from "@/lib/services/enhance";
import { buildCaptionEdit, buildRemuxEdit, captionChunkPlan, getRender, startRender } from "@/lib/services/finalEdit";
import { transcribeSegments } from "@/lib/services/qualityReview";
import { downloadTextRemovalOutput, getTextRemoval, startTextRemoval } from "@/lib/services/textRemoval";
import { buildSrt } from "@/lib/services/translate";
import { putObject, signedDownloadUrl } from "@/lib/storage";
import { chunkCues } from "@/lib/captionChunks";
import { CAPTION_PRESETS } from "@/lib/editRecipe";

const MEDIA = "https://media.clipelle.com";
const DIR = path.join(process.cwd(), "public", "examples");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out = (f: string) => path.join(DIR, f);
async function save(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(out(file), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${file}`);
}
async function untilFal(get: () => Promise<{ status: string; url?: string; error?: string }>) {
  for (let i = 0; i < 120; i++) {
    const s = await get();
    if (s.status === "COMPLETED" && s.url) return s.url;
    if (s.status === "FAILED") throw new Error(s.error);
    await sleep(5000);
  }
  throw new Error("timeout");
}
async function render(edit: { timeline: unknown; output: unknown }) {
  const { renderId } = await startRender(edit as Parameters<typeof startRender>[0]);
  for (let i = 0; i < 120; i++) {
    const r = await getRender(renderId);
    if (r.status === "done" && r.url) return r.url;
    if (r.status === "failed") throw new Error(r.error ?? "render failed");
    await sleep(5000);
  }
  throw new Error("render timeout");
}

// Remove background: a frame of the Senvia video (a man holding the product).
if (!existsSync(out("tool-remove-background-after.png"))) {
  copyFileSync(out("translate-senvia-original.jpg"), out("tool-remove-background-before.jpg"));
  const { requestId } = await submitBackgroundRemoval({ imageUrl: `${MEDIA}/translate-senvia-original.jpg` });
  await save(await untilFal(() => getBackgroundRemovalStatus(requestId)), "tool-remove-background-after.png");
}

// Enhance an image: the same 480 px wide frame, twice as big.
if (!existsSync(out("tool-enhance-image-after.jpg"))) {
  copyFileSync(out("translate-senvia-original.jpg"), out("tool-enhance-image-before.jpg"));
  const { requestId } = await submitImageEnhance({ imageUrl: `${MEDIA}/translate-senvia-original.jpg`, factor: 2, png: false });
  await save(await untilFal(() => getToolEnhanceStatus("image", requestId)), "tool-enhance-image-after.jpg");
}

// Enhance a video: the Senvia video (480 × 864) to 1080p.
if (!existsSync(out("tool-enhance-video-after.mp4"))) {
  const { requestId } = await submitVideoEnhance({ videoUrl: `${MEDIA}/translate-senvia-original.mp4`, factor: 2.25 });
  await save(await untilFal(() => getToolEnhanceStatus("video", requestId)), "tool-enhance-video-after.mp4");
}

// Add captions: the unboxing video, which has none.
if (!existsSync(out("tool-captions-after.mp4"))) {
  const video = `${MEDIA}/translate-unboxing-original.mp4`;
  const t = await transcribeSegments(video, `site-example-captions-1`);
  const style = CAPTION_PRESETS.find((p) => p.key === "yellow")!.style;
  const cues = chunkCues(t.segments.map((s, i) => ({ index: i + 1, ...s })), captionChunkPlan({ captionStyle: style }).chunkChars);
  await putObject("site-examples/captions.srt", new TextEncoder().encode(buildSrt(cues)), "application/x-subrip");
  const srtUrl = await signedDownloadUrl("site-examples/captions.srt", 3600);
  await save(await render(buildCaptionEdit({ videoUrl: video, seconds: t.seconds ?? 8, srtUrl, captionStyle: style, captionPosition: "low", fit: "crop" })), "tool-captions-after.mp4");
}

// Remove on-screen text: the coffee video, which has captions burned into the picture.
if (!existsSync(out("tool-remove-text-after.mp4"))) {
  const video = `${MEDIA}/translate-coffee-gift-original.mp4`;
  const { predictionId } = await startTextRemoval({ videoUrl: video });
  let picture: Uint8Array | null = null;
  for (let i = 0; i < 160 && !picture; i++) {
    const s = await getTextRemoval(predictionId);
    if (s.status === "done") picture = await downloadTextRemovalOutput(s.outputUrl);
    else if (s.status === "failed") throw new Error(s.error);
    else await sleep(6000);
  }
  if (!picture) throw new Error("text removal timeout");
  await putObject("site-examples/cleaned-picture.mp4", picture, "video/mp4");
  const pictureUrl = await signedDownloadUrl("site-examples/cleaned-picture.mp4", 3600);
  await save(await render(buildRemuxEdit({ pictureUrl, soundUrl: video, seconds: 13.2, size: { width: 720, height: 1280 } })), "tool-remove-text-after.mp4");
}

for (const f of ["tool-remove-text-after.mp4", "tool-captions-after.mp4", "tool-enhance-video-after.mp4"]) {
  if (existsSync(out(f))) console.log(`  ${f} ready`);
}
console.log("Done. Upload with: npm run examples:upload");
