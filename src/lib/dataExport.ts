import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { apiKeys, assets, creditLedger, db, profiles, projects, purchases, translations, workspaceMembers, workspaces } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";
import type { AppUser } from "@/lib/auth";

export const EXPORT_LINK_DAYS = 7;

/**
 * "Download your data" (2 Nov 2026): one JSON file with the profile, the workspaces, every project
 * with its settings and results, the credit history, the purchases and the settings. Videos and
 * images are links that work for seven days. Only what belongs to this account.
 */
export async function buildDataExport(user: AppUser) {
  const d = db();
  const [profile] = await d.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  const own = await d.select().from(workspaces).where(eq(workspaces.ownerUserId, user.id));
  const member = await d.select({ ws: workspaces, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)).where(eq(workspaceMembers.userId, user.id));
  const personalIds = own.filter((w) => w.kind === "personal").map((w) => w.id);
  const projs = await d.select().from(projects).where(eq(projects.ownerId, user.id)).orderBy(desc(projects.createdAt));
  const ids = projs.map((p) => p.id);
  const files = ids.length ? await d.select().from(assets).where(inArray(assets.projectId, ids)) : [];
  const langs = ids.length ? await d.select().from(translations).where(inArray(translations.projectId, ids)) : [];
  const ledger = personalIds.length ? await d.select().from(creditLedger).where(inArray(creditLedger.workspaceId, personalIds)).orderBy(desc(creditLedger.createdAt)) : [];
  const bought = personalIds.length ? await d.select().from(purchases).where(inArray(purchases.workspaceId, personalIds)).orderBy(desc(purchases.createdAt)) : [];
  const keys = await d.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt }).from(apiKeys).where(eq(apiKeys.userId, user.id));
  const link = async (path: string) => {
    try {
      return await signedDownloadUrl(path, EXPORT_LINK_DAYS * 86_400);
    } catch {
      return null;
    }
  };
  const fileLinks = await Promise.all(files.map(async (f) => ({ projectId: f.projectId, kind: f.kind, bytes: f.bytes, mime: f.mime, seconds: f.seconds, createdAt: f.createdAt, url: await link(f.storagePath) })));
  return {
    exportedAt: new Date().toISOString(),
    linksValidFor: `${EXPORT_LINK_DAYS} days`,
    profile: profile ? { email: profile.email, name: profile.name, createdAt: profile.createdAt, notifyEmail: profile.notifyEmail, twoStepVerification: profile.totpEnabled, termsVersion: profile.termsVersion, termsAcceptedAt: profile.termsAcceptedAt, referredBy: profile.referredBy, deletionRequestedAt: profile.deletionRequestedAt } : { email: user.email, name: user.name ?? null },
    settings: { brand: profile?.brand ?? null },
    workspaces: [...own.map((w) => ({ id: w.id, name: w.name, kind: w.kind, role: "owner", planKey: w.planKey, subscriptionStatus: w.subscriptionStatus, createdAt: w.createdAt })), ...member.map((m) => ({ id: m.ws.id, name: m.ws.name, kind: m.ws.kind, role: m.role, planKey: m.ws.planKey, subscriptionStatus: m.ws.subscriptionStatus, createdAt: m.ws.createdAt }))],
    apiKeys: keys,
    projects: projs.map((p) => ({ id: p.id, name: p.name, workflow: p.workflow, status: p.status, createdAt: p.createdAt, updatedAt: p.updatedAt, rightsConfirmedAt: p.rightsConfirmedAt, tags: p.tags, input: p.input, files: fileLinks.filter((f) => f.projectId === p.id).map(({ projectId: _p, ...rest }) => rest), translations: langs.filter((t) => t.projectId === p.id).map((t) => ({ language: t.language, status: t.status, segments: t.segments, qa: t.qa })) })),
    creditHistory: ledger.map((l) => ({ at: l.createdAt, credits: l.credits, kind: l.kind, note: l.note, projectId: l.projectId })),
    purchases: bought.map((b) => ({ at: b.createdAt, item: b.item, credits: b.credits, amount: b.amountCents / 100, currency: b.currency, status: b.status, termsVersion: b.termsVersion })),
  };
}
