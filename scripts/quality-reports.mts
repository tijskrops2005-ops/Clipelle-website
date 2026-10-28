/**
 * Prints the latest quality reports with Tijs's verdicts (28 Oct 2026), so patterns over many test
 * videos can be read in one go: which checks fail most, which labels come back, the notes.
 *   npm run quality:report [-- limit]        (local database)
 *   npm run quality:report:prod [-- limit]   (production, Tijs runs it)
 * Read-only. Use --env-file=.env.prod only with Tijs's permission (it reads production).
 */
import { desc, eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { projects, qualityReports } from "../src/lib/db/schema";

const limit = Number(process.argv[2] ?? 30);
const rows = await db().select({ r: qualityReports, name: projects.name }).from(qualityReports).innerJoin(projects, eq(projects.id, qualityReports.projectId)).orderBy(desc(qualityReports.createdAt)).limit(limit);
const tally = new Map<string, number>();
for (const { r, name } of rows) {
  console.log(`\n${r.createdAt.toISOString().slice(0, 16)}  ${name} · ${r.language}  score ${r.score ?? "–"}  ${r.rating ? `verdict ${r.rating}` : ""} ${r.labels.length ? `[${r.labels.join(", ")}]` : ""}`);
  if (r.note) console.log(`  note: ${r.note}`);
  for (const c of r.checks) {
    if (c.status === "pass") continue;
    tally.set(`${c.label} (${c.status})`, (tally.get(`${c.label} (${c.status})`) ?? 0) + 1);
    console.log(`  [${c.status}] ${c.label}: ${c.detail}`);
    for (const it of c.items ?? []) console.log(`      ${it}`);
  }
  for (const l of r.labels) tally.set(`verdict: ${l}`, (tally.get(`verdict: ${l}`) ?? 0) + 1);
}
console.log("\nMost common:");
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${n}× ${k}`);
process.exit(0);
