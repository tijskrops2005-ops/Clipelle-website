import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { assets, db, projects } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";
import { reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { EXTRACT_FRAME_USD, extractFrame } from "@/lib/services/textLocate";

/**
 * The picture in the "your video is ready" e-mail (27 Oct 2026, Tijs): one frame from the middle of
 * the finished video, with rounded corners and a play button drawn on, as a JPEG small enough to send
 * inline (cid:), so no public image link to a customer's video is ever needed. The frame grab goes
 * through the cost guard like every paid call; any problem returns null and the mail goes without it.
 */
export const MAIL_POSTER_WIDTH = 480; // drawn at 2× for a 240 px wide picture in the mail

export type MailPoster = { jpeg: Buffer; width: number; height: number };

export async function makeMailPoster(projectId: string): Promise<MailPoster | null> {
  try {
    const [video] = await db()
      .select({ storagePath: assets.storagePath, language: assets.language })
      .from(assets)
      .where(and(eq(assets.projectId, projectId), inArray(assets.kind, ["final", "captioned"])))
      .orderBy(asc(assets.createdAt))
      .limit(1);
    if (!video) return null;
    const [row] = await db().select({ workflow: projects.workflow, input: projects.input }).from(projects).where(eq(projects.id, projectId)).limit(1);
    const languages = row?.workflow === "translate" ? ((row.input as { targetLanguages?: string[] }).targetLanguages?.length ?? 1) : 1;
    const reserved = await reserveSpend({ service: "fal", action: "extract_frame", estimatedUsd: EXTRACT_FRAME_USD, fingerprintInput: { projectId, mailPoster: video.storagePath }, projectId, languageCount: Math.max(1, languages), meta: { purpose: "mail_poster" } });
    let frameUrl: string;
    try {
      frameUrl = await extractFrame(await signedDownloadUrl(video.storagePath, 600), "middle");
      await settleSpend(reserved.entryId, { status: "completed", actualUsd: EXTRACT_FRAME_USD, basis: "list" });
    } catch (error) {
      await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
    const res = await fetch(frameUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return await drawPoster(Buffer.from(await res.arrayBuffer()));
  } catch (error) {
    console.error("[mail poster]", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Frame → rounded picture with a play button, on the mail's white card. Pure apart from sharp; tested. */
export async function drawPoster(frame: Buffer): Promise<MailPoster> {
  const base = await sharp(frame).resize({ width: MAIL_POSTER_WIDTH, height: Math.round(MAIL_POSTER_WIDTH * 2), fit: "inside", withoutEnlargement: false }).toBuffer({ resolveWithObject: true });
  const { width, height } = base.info;
  const r = 32;
  const cx = width / 2;
  const cy = height / 2;
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#111114" stop-opacity="0"/><stop offset="1" stop-color="#111114" stop-opacity="0.45"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <circle cx="${cx}" cy="${cy}" r="58" fill="#FFFFFF" fill-opacity="0.94"/>
      <path d="M ${cx - 16} ${cy - 24} L ${cx + 26} ${cy} L ${cx - 16} ${cy + 24} Z" fill="#D43F1B"/>
    </svg>`,
  );
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" ry="${r}" fill="#000"/></svg>`);
  const rounded = await sharp(base.data).ensureAlpha().composite([{ input: overlay }, { input: mask, blend: "dest-in" }]).png().toBuffer();
  const jpeg = await sharp(rounded).flatten({ background: "#FFFFFF" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  return { jpeg, width, height };
}
