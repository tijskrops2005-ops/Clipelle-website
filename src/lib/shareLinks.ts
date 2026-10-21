import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { assets, db, projects, shareLinks, translations } from "@/lib/db";
import { DataError } from "@/lib/data/errors";
import { signedDownloadUrl } from "@/lib/storage";
import type { DataScope } from "@/lib/data/server";

/**
 * Public viewing links (2026-10-21): a finished video can be shown to someone without an account.
 * The token is 32 random bytes; only its SHA-256 lands in the database. A link expires, can be
 * revoked, optionally allows download, and resolves to the video, its name and nothing else.
 */
export const MAX_SHARE_DAYS = 90;
export const DEFAULT_SHARE_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createShareLink(scope: DataScope, projectId: string, input: { expiresInDays?: number; allowDownload?: boolean; language?: string }) {
  const [row] = await db().select().from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, scope.workspaceId))).limit(1);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "completed") throw new DataError("Only a finished video can be shared.", 409, "not_completed");
  if (row.workflow === "ad" && !row.finalAssetId) throw new DataError("This ad has no finished video.", 409, "not_completed");
  if (row.workflow === "translate") {
    if (!input.language) throw new DataError("Choose which language version to share.", 400, "language_required");
    const [t] = await db().select({ id: translations.id, status: translations.status }).from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, input.language))).limit(1);
    if (!t || t.status !== "completed") throw new DataError("That language version is not finished.", 409, "not_completed");
  }
  const days = Math.min(MAX_SHARE_DAYS, Math.max(1, Math.round(input.expiresInDays ?? DEFAULT_SHARE_DAYS)));
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const [link] = await db().insert(shareLinks).values({ projectId, workspaceId: scope.workspaceId, userId: scope.userId, tokenHash: hashToken(token), language: row.workflow === "translate" ? input.language : null, expiresAt, allowDownload: Boolean(input.allowDownload) }).returning();
  return { id: link.id, token, expiresAt: link.expiresAt, allowDownload: link.allowDownload, language: link.language };
}

/** Links of one project, scoped; never the token (it was shown once). */
export async function listShareLinks(scope: DataScope, projectId: string) {
  const rows = await db().select().from(shareLinks).where(and(eq(shareLinks.projectId, projectId), eq(shareLinks.workspaceId, scope.workspaceId))).orderBy(desc(shareLinks.createdAt));
  return rows.map((r) => ({ id: r.id, language: r.language, expiresAt: r.expiresAt, allowDownload: r.allowDownload, revokedAt: r.revokedAt, views: r.views, createdAt: r.createdAt, active: !r.revokedAt && r.expiresAt > new Date() }));
}

export async function revokeShareLink(scope: DataScope, linkId: string) {
  const updated = await db().update(shareLinks).set({ revokedAt: new Date() }).where(and(eq(shareLinks.id, linkId), eq(shareLinks.workspaceId, scope.workspaceId), isNull(shareLinks.revokedAt))).returning({ id: shareLinks.id });
  if (updated.length === 0) throw new DataError("Link not found.", 404, "not_found");
}

export type SharedVideo = { name: string; videoUrl: string; allowDownload: boolean; expiresAt: string; language: string | null };

/** The public lookup: an active link resolves to the video and its name only; anything else is null. */
export async function resolveShareToken(token: string): Promise<SharedVideo | null> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const [link] = await db().select().from(shareLinks).where(and(eq(shareLinks.tokenHash, hashToken(token)), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date()))).limit(1);
  if (!link) return null;
  const [row] = await db().select({ name: projects.name, workflow: projects.workflow, status: projects.status, finalAssetId: projects.finalAssetId }).from(projects).where(eq(projects.id, link.projectId)).limit(1);
  if (!row || row.status !== "completed") return null;
  let assetId: string | null = row.finalAssetId;
  if (row.workflow === "translate" && link.language) {
    const [t] = await db().select({ a: translations.captionedAssetId, b: translations.enhancedAssetId, c: translations.videoAssetId }).from(translations).where(and(eq(translations.projectId, link.projectId), eq(translations.language, link.language))).limit(1);
    assetId = t?.a ?? t?.b ?? t?.c ?? null;
  }
  if (!assetId) return null;
  const [asset] = await db().select({ storagePath: assets.storagePath }).from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) return null;
  await db().update(shareLinks).set({ views: sql`${shareLinks.views} + 1` }).where(eq(shareLinks.id, link.id));
  const videoUrl = await signedDownloadUrl(asset.storagePath, 3600, link.allowDownload ? `${row.name}.mp4` : undefined);
  return { name: row.name, videoUrl, allowDownload: link.allowDownload, expiresAt: link.expiresAt.toISOString(), language: link.language };
}
