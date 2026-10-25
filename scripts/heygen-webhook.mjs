/**
 * Registers the HeyGen webhook endpoint for a deployed site (production replacement for the
 * development page /dev/webhooks). Reads HEYGEN_API_KEY and APP_BASE_URL from the env file given
 * as the first argument (default .env.prod), registers <APP_BASE_URL>/api/webhooks/heygen for the
 * video and translation events, and writes the secret HeyGen returns (only once) straight into
 * HEYGEN_WEBHOOK_SECRET in that file. Nothing secret is printed.
 *
 *   npm run heygen:webhook              # uses .env.prod
 *   npm run heygen:webhook -- .env.prod --replace   # delete our existing endpoint first, then register again
 *
 * Free calls only. Afterwards copy HEYGEN_WEBHOOK_SECRET to Vercel (npm run vercel:env).
 */
import { readEnvFile, setEnvVar } from "./env-file.mjs";

process.on("uncaughtException", (e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? ".env.prod";
const replace = args.includes("--replace");
const env = readEnvFile(file);
const key = env.HEYGEN_API_KEY;
const base = (env.APP_BASE_URL ?? "").replace(/\/$/, "");
if (!key) throw new Error(`HEYGEN_API_KEY is empty in ${file}.`);
if (!/^https:\/\//.test(base)) throw new Error(`APP_BASE_URL in ${file} must be the public https address of the site (e.g. https://www.clipelle.com).`);

const url = `${base}/api/webhooks/heygen`;
const EVENTS = ["avatar_video.success", "avatar_video.fail", "video_translate.success", "video_translate.fail"];
async function heygen(path, init = {}) {
  const res = await fetch(`https://api.heygen.com${path}`, { ...init, headers: { "X-Api-Key": key, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HeyGen ${init.method ?? "GET"} ${path} answered ${res.status}: ${body?.error?.message ?? body?.message ?? "no details"}`);
  return body?.data ?? body;
}

const listed = await heygen("/v3/webhooks/endpoints");
const endpoints = Array.isArray(listed) ? listed : (listed?.endpoints ?? listed?.items ?? []);
const ours = endpoints.filter((e) => e.url === url);
if (ours.length && !replace) {
  console.log(`An endpoint for ${url} is already registered (${ours.map((e) => e.endpoint_id).join(", ")}).`);
  console.log(env.HEYGEN_WEBHOOK_SECRET ? `HEYGEN_WEBHOOK_SECRET is set in ${file}; nothing to do.` : `HEYGEN_WEBHOOK_SECRET is empty in ${file} and HeyGen shows a secret only once: run again with --replace.`);
  process.exit(0);
}
for (const e of ours) {
  await heygen(`/v3/webhooks/endpoints/${e.endpoint_id}`, { method: "DELETE" });
  console.log(`Removed the old endpoint ${e.endpoint_id}.`);
}
const created = await heygen("/v3/webhooks/endpoints", { method: "POST", body: JSON.stringify({ url, events: EVENTS }) });
if (!created?.secret) throw new Error("HeyGen registered the endpoint but returned no secret; check it in the HeyGen dashboard.");
setEnvVar(file, "HEYGEN_WEBHOOK_SECRET", created.secret);
console.log(`Registered ${url} (${created.endpoint_id}) for ${EVENTS.join(", ")}.`);
console.log(`The secret is saved as HEYGEN_WEBHOOK_SECRET in ${file} (not shown). Next: npm run vercel:env`);
