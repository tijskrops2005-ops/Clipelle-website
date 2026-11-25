// Records a realistic walk-through of the app (demo mode): a drawn cursor glides to real elements, clicks
// with a ripple, types, and the app reacts for real. 24 frames/s as JPEGs plus clicks.json (the moments of
// every click, for the click sounds). Usage: node director.mjs <base> <outdir>
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
const [BASE, OUT] = process.argv.slice(2);
rmSync(`${OUT}/frames`, { recursive: true, force: true });
mkdirSync(`${OUT}/frames`, { recursive: true });
const PORT = 9300 + Math.floor(Math.random() * 90);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [`--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-${PORT}`, "--headless=new", "--hide-scrollbars", "--no-first-run", "--autoplay-policy=no-user-gesture-required", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("DOM.enable");
await send("Network.setCookie", { name: "clipelle_consent", value: encodeURIComponent(JSON.stringify({ v: 1, necessary: true, analytics: false, marketing: false, at: new Date().toISOString() })), domain: new URL(BASE).hostname, path: "/" });
const W = 1440, H = 900, FPS = 24;
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

const OVERLAY = `(() => {
  if (document.getElementById("__cur")) return;
  const st = document.createElement("style");
  st.textContent = '#__cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}#__rip{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(212,63,27,.35);z-index:2147483646;pointer-events:none;transform:scale(0);opacity:0}#__cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483645;display:flex;align-items:center;gap:10px;background:rgba(17,17,20,.92);color:#fff;font:600 17px/1.2 -apple-system,Helvetica,Arial,sans-serif;padding:10px 20px 10px 10px;border-radius:999px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 16px 40px -10px rgba(0,0,0,.5);white-space:nowrap}#__cap b{width:28px;height:28px;border-radius:50%;background:#D43F1B;display:grid;place-items:center;font-size:14px}#__cap:empty{display:none}nextjs-portal{display:none!important}div[role=status].fixed{display:none!important}button[aria-label="Ask the support assistant"]{display:none!important}';
  document.head.appendChild(st);
  const c = document.createElement("div"); c.id = "__cur";
  c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.7L4 19z" fill="#111114" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  const r = document.createElement("div"); r.id = "__rip"; document.body.appendChild(r);
  const p = document.createElement("div"); p.id = "__cap"; document.body.appendChild(p);
})()`;
// Demo-mode notes have no place in the film.
const HIDE_DEMO = `document.querySelectorAll("p,span,div").forEach(e=>{ if (e.childElementCount===0) { const t=e.textContent.trim(); if (/^(Simulated preview|Demo: nothing is charged\\.?|Demo mode)$/i.test(t) || /^Demo mode:/.test(t)) e.style.display="none"; } })`;
let cx = 720, cy = 450, frame = 0, caption = "";
const clicks = [];
const install = async () => { await ev(OVERLAY); await ev(HIDE_DEMO); await ev(`(()=>{const c=document.getElementById("__cur"); c.style.left=${cx}+"px"; c.style.top=${cy}+"px"; document.getElementById("__cap").innerHTML=${JSON.stringify(caption)};})()`); };
const snap = async () => {
  const y = (await ev("window.scrollY")) || 0;
  const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 88, clip: { x: 0, y, width: W, height: H, scale: 1 } });
  writeFileSync(`${OUT}/frames/f${String(frame++).padStart(5, "0")}.jpg`, Buffer.from(r.data, "base64"));
};
const live = async (seconds) => { const n = Math.round(seconds * FPS); for (let i = 0; i < n; i++) await snap(); };
const hold = async (seconds) => { await snap(); const n = Math.round(seconds * FPS); const src = `${OUT}/frames/f${String(frame - 1).padStart(5, "0")}.jpg`; for (let i = 1; i < n; i++) copyFileSync(src, `${OUT}/frames/f${String(frame++).padStart(5, "0")}.jpg`); };
const setCaption = async (n, text) => { caption = `<b>${n}</b>${text}`; await ev(`document.getElementById("__cap").innerHTML=${JSON.stringify(caption)}`); };
const center = async (sel) => ev(`(()=>{const el=${sel}; if(!el) return null; el.scrollIntoView({block:"nearest"}); const r=el.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};})()`);
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
async function moveTo(sel, seconds = 0.9) {
  const p = await center(sel);
  if (!p) { console.log("missing", sel.slice(0, 80)); return false; }
  const n = Math.max(6, Math.round(seconds * FPS)), sx = cx, sy = cy;
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    cx = sx + (p.x - sx) * k; cy = sy + (p.y - sy) * k - Math.sin(Math.PI * k) * 14;
    await ev(`(()=>{const c=document.getElementById("__cur"); c.style.left=${cx}+"px"; c.style.top=${cy}+"px";})()`);
    await snap();
  }
  return true;
}
async function click(sel, after = 0.5) {
  clicks.push(frame / FPS);
  for (let i = 0; i < 6; i++) {
    const k = (i + 1) / 6;
    await ev(`(()=>{const r=document.getElementById("__rip"); r.style.left=${cx}+"px"; r.style.top=${cy}+"px"; r.style.transform="scale(${0.3 + k})"; r.style.opacity="${1 - k}";})()`);
    await snap();
  }
  await ev(`(()=>{const el=${sel}; el && el.click();})()`);
  await live(after);
}
/** Types into the focused field one character at a time, like a person. */
async function type(text) {
  for (const ch of text) {
    await send("Input.insertText", { text: ch });
    await live(ch === " " ? 0.12 : 0.07);
  }
}
async function scrollBy(px, seconds = 0.8) { const n = Math.round(seconds * FPS); for (let i = 1; i <= n; i++) { await ev(`window.scrollBy(0, ${px / n})`); await snap(); } }
async function go(path) { await send("Page.navigate", { url: `${BASE}${path}` }); await sleep(2200); await install(); }
const q = (css) => `document.querySelector(${JSON.stringify(css)})`;
const byText = (tag, text) => `[...document.querySelectorAll(${JSON.stringify(tag)})].find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)}) && !e.disabled)`;
const option = (text) => `[...document.querySelectorAll("[role=option]")].find(x=>x.textContent.trim()===${JSON.stringify(text)})`;

// The finished version of the same video, for the result and the editor (the real flow takes minutes).
const NAME = "Coffee gift";
const seg = (i, s, e, text) => ({ index: i, start: s, end: e, original: text, translated: text, text });
const project = { id: "prj_walk", workflow: "translate", name: NAME, status: "completed", sourceFileName: "coffee-gift.mp4", sourceSeconds: 13, sourceVideoUrl: "/examples/translate-coffee-gift-original.mp4", sourceLanguage: "auto", detectedLanguage: "en", targetLanguages: ["nl", "de"], quality: "speed", format: "9:16", captionsOn: true, speaker: "original", rightsConfirmedAt: "2026-11-25T10:00:00Z", rightsBasis: "own_upload",
  steps: { upload: { status: "completed", startedAt: "2026-11-25T10:00:00Z", finishedAt: "2026-11-25T10:00:20Z" }, translate: { status: "completed", startedAt: "2026-11-25T10:00:20Z", finishedAt: "2026-11-25T10:04:00Z" }, captions: { status: "completed", startedAt: "2026-11-25T10:04:00Z", finishedAt: "2026-11-25T10:06:30Z" } },
  translations: ["nl", "de"].map((l) => ({ language: l, status: "completed", segments: [seg(1, 0.3, 3, "Mijn moeder is stiekem een beetje boos op me"), seg(2, 3.2, 7, "omdat ik vergat mijn vader iets te geven"), seg(3, 7.4, 12, "dus dit jaar maak ik het goed")], videoUrl: "/examples/translate-coffee-gift-nl.mp4", rawVideoUrl: "/examples/translate-coffee-gift-nl.mp4", phase: { key: "done", at: "2026-11-25T10:06:30Z" } })),
  createdAt: "2026-11-25T10:00:00Z" };
await send("Page.navigate", { url: `${BASE}/app` }); await sleep(2000);
await ev(`localStorage.clear(); localStorage.setItem("clipelle.demo.projects.v2", ${JSON.stringify(JSON.stringify([project]))}); true`);

// 1. Dashboard → Translate a video
await go("/app");
await setCaption(1, "Open Translate a video");
await live(0.9);
await moveTo(byText("a", "Translate a video"), 1.1);
await click(byText("a", "Translate a video"), 0.2);
await sleep(1500); await install();
// 2. Upload + name
await setCaption(2, "Upload a video you own");
await live(0.5);
await moveTo(q(".border-dashed"), 1.0);
await click(q(".border-dashed"), 0.1);
{ const doc = await send("DOM.getDocument", {}); const n = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "input[type=file]" }); if (n?.nodeId) await send("DOM.setFileInputFiles", { nodeId: n.nodeId, files: ["/Users/tijskrops/reelay/public/examples/translate-coffee-gift-original.mp4"] }); }
await live(1.4);
const nameField = q('input[placeholder="Founder story"]');
await moveTo(nameField, 0.8);
await click(nameField, 0.1);
await ev(`(()=>{const i=${nameField}; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; set.call(i,""); i.dispatchEvent(new Event("input",{bubbles:true})); i.focus();})()`);
await type(NAME);
await live(0.4);
// 3. Languages: typed into the search, like a person
await setCaption(3, "Pick the languages you sell in");
await scrollBy(380, 0.8);
await moveTo(`document.getElementById("targets")`, 0.8);
await click(`document.getElementById("targets")`, 0.4);
for (const [typed, lang] of [["Dut", "Dutch"], ["Ger", "German"]]) {
  await ev(`document.querySelector("input[aria-label=Search]")?.focus()`);
  await type(typed);
  await live(0.3);
  await moveTo(option(lang), 0.7);
  await click(option(lang), 0.35);
  await ev(`(()=>{const i=document.querySelector("input[aria-label=Search]"); if(i){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; set.call(i,""); i.dispatchEvent(new Event("input",{bubbles:true}));}})()`);
  if (!(await ev(`!!document.querySelector("[role=option]")`))) { await ev(`document.getElementById("targets").click()`); await live(0.3); }
}
await moveTo(`document.getElementById("targets")`, 0.5);
await click(`document.getElementById("targets")`, 0.5);
// 4. Confirm and start
await setCaption(4, "Confirm and start");
const rights = `[...document.querySelectorAll("input[type=checkbox]")].find(i=>/rights|permission/i.test(i.closest("label")?.textContent||""))`;
await moveTo(rights, 0.9);
await click(rights, 0.3);
await moveTo(byText("button", "Start translation"), 0.7);
await click(byText("button", "Start translation"), 0.6);
await moveTo(byText("button", "Start now"), 0.6);
await click(byText("button", "Start now"), 0.2);
await sleep(1800); await install();
// 5. Progress
await ev("window.scrollTo(0,0)");
await setCaption(5, "Every line is written out and checked, then voiced");
await live(3.4);
// 6. Result (the finished version)
await go("/app/projects/prj_walk");
await ev("document.querySelectorAll('video').forEach(v=>{v.muted=true; v.play().catch(()=>{});})"); await install();
await setCaption(6, "Same voice, matching lips, captions in every language");
await live(1.3);
await scrollBy(300, 0.8);
await moveTo(byText("a", "Download NL"), 1.0);
await live(1.5);
// 7. Editor
await setCaption(7, "Trim, change the captions, add your logo");
await ev("window.scrollTo(0,0)");
await moveTo(byText("a", "Edit"), 1.0);
await click(byText("a", "Edit"), 0.2);
await sleep(2200); await install();
await live(0.6);
await moveTo(byText("button", "Captions"), 0.9);
await click(byText("button", "Captions"), 0.5);
await moveTo(`[...document.querySelectorAll("[role=radio]")].find(x=>x.textContent.trim()==="Yellow word")`, 0.8);
await click(`[...document.querySelectorAll("[role=radio]")].find(x=>x.textContent.trim()==="Yellow word")`, 1.3);
// 8. All tools
await setCaption(8, "And more: enhance, resize, captions, background");
await moveTo(byText("a", "All tools"), 1.1);
await click(byText("a", "All tools"), 0.2);
await sleep(1600); await install();
await live(0.8);
await scrollBy(420, 1.2);
await live(1.2);
writeFileSync(`${OUT}/clicks.json`, JSON.stringify(clicks));
console.log(`frames: ${frame} (${(frame / FPS).toFixed(1)} s), clicks: ${clicks.length}`);
process.exit(0);
