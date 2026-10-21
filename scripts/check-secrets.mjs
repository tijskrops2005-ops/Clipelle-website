#!/usr/bin/env node
/**
 * Refuses to let key-like strings or local env files reach git. Run before every push:
 * `npm run check:secrets`. Scans tracked files plus the index, never .env.local itself.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
const bad = [];
for (const f of tracked) {
  if (/^\.env(?!\.example$)/.test(f) || f.startsWith(".reelay/") || /\.log$/.test(f)) bad.push(`${f}: must not be tracked`);
}
const patterns = [/sk_(live|test)_[A-Za-z0-9]{16,}/, /whsec_[A-Za-z0-9]{16,}/, /sk-ant-[A-Za-z0-9_-]{20,}/, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/, /postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/i, /sb_secret_[A-Za-z0-9_-]{10,}/];
for (const f of tracked) {
  if (/\.(png|jpg|jpeg|mp4|mp3|webm|svg|ico|lock|snap)$/i.test(f) || f.startsWith("node_modules/")) continue;
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const p of patterns) if (p.test(text)) bad.push(`${f}: looks like a secret (${p})`);
}
if (bad.length) {
  console.error("check:secrets FAILED\n" + bad.join("\n"));
  process.exit(1);
}
console.log(`check:secrets OK (${tracked.length} files)`);
