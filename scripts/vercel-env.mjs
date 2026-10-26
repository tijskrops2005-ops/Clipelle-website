/**
 * Copies the production variables from an env file (default .env.prod) to the Vercel project's
 * Production environment, one by one through the Vercel CLI, without printing a value. Tijs runs
 * this himself after `npx vercel login` and `npx vercel link` (it sends his keys to Vercel).
 *
 *   npm run vercel:env                 # .env.prod → Vercel Production
 *   npm run vercel:env -- .env.prod --dry-run   # only lists which names would be sent
 *
 * Rules (docs/go-live.md): INNGEST_DEV is never sent; empty values are skipped; an existing value
 * in Vercel is replaced.
 */
import { spawnSync } from "node:child_process";
import { readEnvFile } from "./env-file.mjs";

process.on("uncaughtException", (e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? ".env.prod";
const dry = args.includes("--dry-run");
const env = readEnvFile(file);
const NEVER = new Set(["INNGEST_DEV"]);
const names = Object.keys(env).filter((n) => env[n] !== "" && !NEVER.has(n));

// Values that must be right in production; stop before sending anything if one is off.
const problems = [];
if (env.NEXT_PUBLIC_DEMO_MODE !== "false") problems.push("NEXT_PUBLIC_DEMO_MODE must be false (otherwise the live site runs in demo mode).");
for (const n of ["APP_BASE_URL", "NEXT_PUBLIC_SITE_URL"]) if (!/^https:\/\//.test(env[n] ?? "")) problems.push(`${n} must be the public https address (https://www.clipelle.com).`);
if (env.STRIPE_SECRET_KEY && !/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)) problems.push("STRIPE_SECRET_KEY is not a test key; the app refuses live keys until the live mode is built.");
if (env.SHOTSTACK_ENV && env.SHOTSTACK_ENV !== "v1") problems.push("SHOTSTACK_ENV should be v1 (production) on the live site; stage adds a watermark.");
if (problems.length) {
  console.error(`Not sent. Fix these in ${file} first:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log(`${names.length} variables from ${file} → Vercel Production${dry ? " (dry run)" : ""}:`);
for (const n of names) {
  if (dry) {
    console.log(`  ${n}`);
    continue;
  }
  spawnSync("npx", ["--yes", "vercel", "env", "rm", n, "production", "--yes"], { stdio: "ignore" });
  const r = spawnSync("npx", ["--yes", "vercel", "env", "add", n, "production"], { input: env[n], stdio: ["pipe", "ignore", "pipe"] });
  console.log(`  ${r.status === 0 ? "✓" : "✗"} ${n}${r.status === 0 ? "" : ` (${String(r.stderr).trim().split("\n").pop()})`}`);
}
if (!dry) console.log("Done. Redeploy in Vercel (or push to main) so the new values are used.");
