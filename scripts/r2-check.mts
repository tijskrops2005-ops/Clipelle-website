/**
 * Checks the Cloudflare R2 setup end to end (29 Oct 2026): upload, read, presigned download, presigned
 * upload, copy, list and delete of one small test file in R2_BUCKET; prints OK or what failed. Never
 * prints a key.
 *   npm run r2:check            (.env.local)
 *   npm run r2:check:prod       (.env.prod)
 */
import { r2Copy, r2Delete, r2Enabled, r2Get, r2Head, r2List, r2PresignedGet, r2PresignedPut, r2Put } from "../src/lib/r2";

if (!r2Enabled()) {
  console.log("R2 is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
  process.exit(1);
}
const path = `checks/r2-check-${Date.now()}.txt`;
const copy = `${path}.copy`;
const step = async (label: string, fn: () => Promise<unknown>) => {
  try {
    const out = await fn();
    console.log(`✓ ${label}${typeof out === "string" ? `: ${out}` : ""}`);
  } catch (error) {
    console.log(`✗ ${label}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
};
await step("upload", () => r2Put(path, new Blob(["hello from Clipelle"], { type: "text/plain" }), "text/plain"));
await step("read back", async () => (await (await r2Get(path))?.text()) === "hello from Clipelle" ? "same text" : Promise.reject(new Error("different text")));
await step("size and type", async () => JSON.stringify(await r2Head(path)));
await step("presigned download", async () => {
  const res = await fetch(await r2PresignedGet(path, 300, "test.txt"));
  return res.ok ? `${res.status}, ${res.headers.get("content-disposition")}` : Promise.reject(new Error(`HTTP ${res.status}`));
});
await step("presigned upload (as the browser does)", async () => {
  const res = await fetch(await r2PresignedPut(`${path}.put`, 300), { method: "PUT", body: "uploaded", headers: { "Content-Type": "text/plain" } });
  return res.ok ? `HTTP ${res.status}` : Promise.reject(new Error(`HTTP ${res.status}`));
});
await step("copy inside the bucket", () => r2Copy(path, copy));
await step("list", async () => `${(await r2List("checks/")).length} test file(s)`);
await step("delete", async () => {
  for (const p of [path, copy, `${path}.put`]) await r2Delete(p);
});
console.log(process.exitCode ? "\nSomething failed; see above." : "\nR2 works. Browser uploads also need the CORS policy on the bucket.");
