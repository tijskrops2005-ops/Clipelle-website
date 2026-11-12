/**
 * Turns finished translations from the database into site samples (12 Nov 2026, after Noah's review:
 * only three samples existed). Read-only on the database and storage; writes files to public/examples/.
 *   npm run samples:list:prod                        finished translations of the admin accounts (ADMIN_EMAILS)
 *   npm run samples:export:prod -- <projectId> <slug> downloads the result per language and the original
 * Each export writes translate-<slug>-<lang>.mp4 (+ .jpg poster from the middle of the video) and
 * translate-<slug>-original.mp4 (+ .jpg), then prints the entry for src/content/examples.ts. Afterwards
 * `npm run examples:upload:prod` puts the files in the public examples bucket.
 * Only the admins' own projects are listed: a customer's video is never a sample. Needs ffmpeg for the posters.
 * Reads production when run with --env-file=.env.prod: Tijs runs it, or gives permission.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { assets, profiles, projects, translations, type TranslateInput } from "../src/lib/db/schema";
import { downloadObject } from "../src/lib/storage";

const [mode = "list", projectId, slug] = process.argv.slice(2);
const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
if (!admins.length) throw new Error("ADMIN_EMAILS is empty: nothing to list.");
const adminIds = (await db().select({ userId: profiles.userId }).from(profiles).where(inArray(profiles.email, admins))).map((r) => r.userId);
if (!adminIds.length) throw new Error("No profile matches ADMIN_EMAILS.");

if (mode === "list") {
  const rows = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.workflow, "translate"), eq(projects.status, "completed"), inArray(projects.ownerId, adminIds)))
    .orderBy(desc(projects.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.id);
  const tr = ids.length ? await db().select().from(translations).where(inArray(translations.projectId, ids)) : [];
  const src = ids.length ? await db().select().from(assets).where(and(inArray(assets.projectId, ids), eq(assets.kind, "source"))) : [];
  console.log(`${rows.length} finished translations of the admin accounts:\n`);
  for (const p of rows) {
    const input = p.input as TranslateInput;
    const s = src.find((a) => a.projectId === p.id && a.id === input.sourceAssetId) ?? src.find((a) => a.projectId === p.id);
    const langs = tr.filter((t) => t.projectId === p.id).map((t) => `${t.language}${t.status === "completed" ? "" : ` (${t.status})`}`);
    const dims = s?.width && s?.height ? `${s.width}×${s.height}` : "?";
    console.log(`${p.createdAt.toISOString().slice(0, 10)}  ${p.id}  "${p.name}"  ${s?.seconds ? `${Math.round(s.seconds)} s` : ""} ${dims}  → ${langs.join(", ")}${input.removeText ? "  text removed" : ""}${input.speaker === "presenter" ? "  presenter" : ""}${p.parentId ? "  (version)" : ""}`);
  }
  console.log(`\nExport one: npm run samples:export:prod -- <projectId> <slug>   (slug like "lounge-chair")`);
  process.exit(0);
}

if (mode !== "export" || !projectId || !slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Usage: list | export <projectId> <slug>  (slug: lower-case letters, digits and dashes)");

const [p] = await db().select().from(projects).where(and(eq(projects.id, projectId), inArray(projects.ownerId, adminIds))).limit(1);
if (!p || p.workflow !== "translate") throw new Error("No translation of an admin account with that id.");
const input = p.input as TranslateInput;
const tr = await db().select().from(translations).where(eq(translations.projectId, p.id));
const as = await db().select().from(assets).where(eq(assets.projectId, p.id));
const byId = new Map(as.map((a) => [a.id, a]));
const dir = path.join(process.cwd(), "public", "examples");
mkdirSync(dir, { recursive: true });

async function save(storagePath: string, fileName: string) {
  const blob = await downloadObject(storagePath);
  if (!blob) throw new Error(`Missing in storage: ${fileName}`);
  const target = path.join(dir, fileName);
  writeFileSync(target, new Uint8Array(await blob.arrayBuffer()));
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", target]).toString().trim()) || 0;
  const poster = fileName.replace(/\.mp4$/, ".jpg");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", (seconds * 0.4).toFixed(2), "-i", target, "-frames:v", "1", "-q:v", "3", path.join(dir, poster)]);
  console.log(`✓ ${fileName} (${(blob.size / 1e6).toFixed(1)} MB, ${Math.round(seconds)} s) + ${poster}`);
  return { poster, seconds };
}

const source = byId.get(input.sourceAssetId);
if (!source) throw new Error("This project has no stored source video.");
const original = await save(source.storagePath, `translate-${slug}-original.mp4`);
for (const t of tr.filter((t) => t.status === "completed")) {
  const asset = byId.get(t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId ?? "");
  if (!asset) {
    console.log(`– ${t.language}: no finished file`);
    continue;
  }
  const code = t.language.toLowerCase();
  const result = await save(asset.storagePath, `translate-${slug}-${code}.mp4`);
  const from = (input.sourceLanguage && input.sourceLanguage !== "auto" ? input.sourceLanguage : p.detectedLanguage ?? "EN").toUpperCase();
  console.log(`
  // Add to src/content/examples.ts:
  {
    id: "${slug}-${code}",
    title: "${p.name.replace(/"/g, "'")}, translated",
    kind: "translate",
    file: "translate-${slug}-${code}.mp4",
    poster: "translate-${slug}-${code}.jpg",
    original: "translate-${slug}-original.mp4",
    originalPoster: "${original.poster}",
    codes: "${from} → ${t.language.toUpperCase()}",
    note: "${Math.round(result.seconds)} s · ${from} to ${t.language.toUpperCase()} · own voice, lip sync, captions",
  },`);
}
console.log("\nThen: npm run examples:upload:prod");
process.exit(0);
