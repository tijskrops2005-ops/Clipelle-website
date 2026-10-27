/**
 * Developer fixture (27 Oct 2026): puts a translate project in a chosen state into the LOCAL
 * database, so the project page, the tiles and the dashboard can be looked at without a paid run.
 * The files are our own example videos from public/examples. Never for production.
 *
 *   npx tsx --env-file=.env.local scripts/dev-fixture.mts <processing|done|failed|mid> <user id> [languages, e.g. nl,de,fr]
 */
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { assets, projects, steps, translations, type TranslateInput } from "../src/lib/db/schema";
import { createDraft } from "../src/lib/data/server";
import { ensurePersonalWorkspace } from "../src/lib/workspaces";
import { objectPath, putObject } from "../src/lib/storage";

if (process.env.NODE_ENV === "production" || /prod/i.test(process.env.DATABASE_URL ?? "")) throw new Error("local database only");
const [state = "processing", userId, langs = "nl"] = process.argv.slice(2);
if (!userId) throw new Error("user id required");
const languages = langs.split(",");

const ws = await ensurePersonalWorkspace({ id: userId, email: "shots@clipelle.local", name: "Shots Tester" });
const scope = { userId, workspaceId: ws.id };
const row = await createDraft(scope, {
  workflow: "translate",
  translate: { name: `Fixture ${state} ${new Date().toISOString().slice(11, 16)}`, sourceFileName: "senvia-original.mp4", sourceSeconds: 8, sourceLanguage: "auto", targetLanguages: languages, quality: "speed", format: "9:16", enhance: false, rightsConfirmed: true, captionStyle: { show: true } },
});
const put = async (file: string, kind: "source" | "captioned", language?: string) => {
  const bytes = readFileSync(`public/examples/${file}`);
  const path = objectPath({ projectId: row.id, kind, fileName: file, language });
  await putObject(path, new Uint8Array(bytes), "video/mp4");
  const [a] = await db().insert(assets).values({ projectId: row.id, userId, kind, language, storagePath: path, mime: "video/mp4", bytes: bytes.length, seconds: 8, width: 720, height: 1280 }).returning();
  return a.id;
};
const sourceId = await put("translate-senvia-original.mp4", "source");
await db().update(projects).set({ input: { ...(row.input as TranslateInput), sourceAssetId: sourceId } }).where(eq(projects.id, row.id));

const now = Date.now();
const at = (secAgo: number) => new Date(now - secAgo * 1000);
const setStep = (key: string, patch: Record<string, unknown>) => db().update(steps).set(patch).where(and(eq(steps.projectId, row.id), eq(steps.key, key)));
const setLang = (language: string, patch: Record<string, unknown>) => db().update(translations).set(patch).where(and(eq(translations.projectId, row.id), eq(translations.language, language)));

if (state === "processing") {
  // Just past the upload: translating and checking.
  await setStep("upload", { status: "completed", startedAt: at(40), finishedAt: at(28) });
  await setStep("translate", { status: "processing", startedAt: at(28) });
  await db().update(projects).set({ status: "processing" }).where(eq(projects.id, row.id));
} else if (state === "mid") {
  // Translation checked; the first language is ready, the others render.
  await setStep("upload", { status: "completed", startedAt: at(260), finishedAt: at(248) });
  await setStep("translate", { status: "completed", startedAt: at(248), finishedAt: at(190) });
  const phases: Record<string, { key: string; at: string }> = {};
  for (const [i, l] of languages.entries()) {
    if (i === 0) {
      const captioned = await put("translate-senvia-nl.mp4", "captioned", l);
      await setLang(l, { status: "completed", captionedAssetId: captioned, qa: { changes: [{ index: 1, before: "Mijn dokter zei al", after: "Mijn dokter zei al jaren", reason: "A missing word was restored." }], warnings: [], summary: "The translation reads naturally and matches the original." } });
      phases[l] = { key: "done", at: at(20).toISOString() };
    } else {
      await setLang(l, { status: "processing" });
      phases[l] = i === 1 ? { key: "captions", at: at(30).toISOString() } : { key: "voice", at: at(150).toISOString() };
    }
  }
  await setStep("captions", { status: "processing", startedAt: at(190), output: { phases } });
  await db().update(projects).set({ status: "processing" }).where(eq(projects.id, row.id));
} else if (state === "done") {
  await setStep("upload", { status: "completed", startedAt: at(400), finishedAt: at(388) });
  await setStep("translate", { status: "completed", startedAt: at(388), finishedAt: at(330) });
  await setStep("captions", { status: "completed", startedAt: at(330), finishedAt: at(120) });
  for (const l of languages) {
    const captioned = await put("translate-senvia-nl.mp4", "captioned", l);
    await setLang(l, { status: "completed", captionedAssetId: captioned, qa: { changes: [], warnings: [], summary: "The translation reads naturally and matches the original." } });
  }
  await db().update(projects).set({ status: "completed" }).where(eq(projects.id, row.id));
} else if (state === "failed") {
  await setStep("upload", { status: "completed", startedAt: at(100), finishedAt: at(88) });
  await setStep("translate", { status: "failed", startedAt: at(88), finishedAt: at(30), error: "The audio was too quiet to write out. Check that the speaker is clearly audible and try again." });
  await db().update(projects).set({ status: "failed" }).where(eq(projects.id, row.id));
}
console.log(row.id);
process.exit(0);
