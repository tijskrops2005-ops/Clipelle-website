import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Originality check for the blog: for every article in src/content/blog, report any run of
 * N (default 8) or more consecutive words that also appears in one of the source texts in the
 * folder given as the first argument (plain-text or HTML files, fetched temporarily and never
 * committed). Usage: node scripts/check-originality.mjs <sources-dir> [minWords]
 */
const dir = process.argv[2];
const N = Number(process.argv[3] ?? "8");
if (!dir) {
  console.error("Usage: node scripts/check-originality.mjs <sources-dir> [minWords]");
  process.exit(2);
}
const words = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const shingles = (ws) => {
  const set = new Set();
  for (let i = 0; i + N <= ws.length; i++) set.add(ws.slice(i, i + N).join(" "));
  return set;
};
const sources = readdirSync(dir).filter((f) => !f.startsWith(".")).map((f) => ({ name: f, shingles: shingles(words(readFileSync(path.join(dir, f), "utf8"))) }));
const blogDir = path.join(process.cwd(), "src", "content", "blog");
let problems = 0;
for (const f of readdirSync(blogDir).filter((f) => f.endsWith(".md"))) {
  const ws = words(readFileSync(path.join(blogDir, f), "utf8").replace(/^---[\s\S]*?---/, ""));
  const hits = [];
  for (let i = 0; i + N <= ws.length; i++) {
    const sh = ws.slice(i, i + N).join(" ");
    for (const s of sources) if (s.shingles.has(sh)) hits.push({ source: s.name, text: sh });
  }
  const unique = Array.from(new Map(hits.map((h) => [h.text, h])).values());
  if (unique.length) {
    problems += unique.length;
    console.log(`✗ ${f}: ${unique.length} overlapping run(s) of ${N}+ words`);
    for (const h of unique.slice(0, 10)) console.log(`   "${h.text}" ← ${h.source}`);
  } else {
    console.log(`✓ ${f}: no run of ${N}+ words shared with ${sources.length} sources (${ws.length} words)`);
  }
}
console.log(problems ? `\n${problems} overlap(s) found` : "\nNo overlaps found");
process.exit(problems ? 1 : 0);
