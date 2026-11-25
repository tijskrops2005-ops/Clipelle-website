import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/site/CodeBlock";
import { DocsLayout, SoonCallout } from "@/components/site/DocsLayout";
import { AD_LENGTHS } from "@/lib/pricing";
import { config } from "@/lib/config";
import { siteUrl } from "@/lib/brand";
import { viaLogin } from "@/components/site/siteNav";

export const metadata: Metadata = { title: "API documentation", description: "Translate videos from your own code: endpoints, examples in curl and JavaScript, webhooks, error codes and limits." };

/** Every example calls the real site (NEXT_PUBLIC_SITE_URL), never a placeholder host. */
const BASE = siteUrl();

/** Translation first (23 Nov 2026). While ads are switched off the ad endpoint is the last section, marked as coming soon. */
const sections = [
  { id: "auth", label: "Authentication" },
  { id: "translations", label: "Translate a video" },
  ...(config.features.ads ? [{ id: "ads", label: "Create an ad" }] : []),
  { id: "projects", label: "Read projects" },
  { id: "webhooks", label: "Webhooks" },
  { id: "idempotency", label: "Idempotency" },
  { id: "errors", label: "Errors" },
  { id: "limits", label: "Limits" },
  ...(config.features.ads ? [] : [{ id: "ads", label: "Ads from a photo (soon)" }]),
];

const curlTranslate = `curl -X POST ${BASE}/api/v1/translations \\
  -H "Authorization: Bearer rl_your_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: explainer-de-fr" \\
  -d '{
    "name": "Explainer, German and French",
    "video": {
      "url": "https://yourcdn.com/explainer.mp4",
      "durationSeconds": 42
    },
    "sourceLanguage": "auto",
    "targetLanguages": ["de", "fr"],
    "quality": "speed",
    "format": "9:16",
    "enhance": false,
    "rightsConfirmed": true
  }'`;

const jsTranslate = `const res = await fetch("${BASE}/api/v1/translations", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CLIPELLE_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "explainer-de-fr",
  },
  body: JSON.stringify({
    name: "Explainer, German and French",
    video: { url: "https://yourcdn.com/explainer.mp4", durationSeconds: 42 },
    sourceLanguage: "auto",
    targetLanguages: ["de", "fr"],
    quality: "speed",
    format: "9:16",
    enhance: false,
    rightsConfirmed: true,
  }),
});
const { project, error } = await res.json();
if (!res.ok) throw new Error(\`\${error.code}: \${error.message}\`);
console.log(project.id, project.status); // "processing"`;

const translateResponse = `{
  "project": {
    "id": "7c0d…",
    "kind": "translation",
    "name": "Explainer, German and French",
    "status": "processing",
    "createdAt": "2026-11-23T10:00:00.000Z",
    "steps": [
      { "key": "upload", "label": "${config.stepLabels.upload}", "status": "completed" },
      { "key": "translate", "label": "${config.stepLabels.translate}", "status": "processing" },
      { "key": "captions", "label": "${config.stepLabels.captions}", "status": "waiting" }
    ],
    "result": {},
    "translations": [
      { "language": "de", "status": "processing" },
      { "language": "fr", "status": "processing" }
    ]
  }
}`;

const jsPoll = `// Resolves with one link per language: { de: "https://…", fr: "https://…" }
async function waitForTranslation(id) {
  for (;;) {
    const res = await fetch(\`${BASE}/api/v1/projects/\${id}\`, {
      headers: { Authorization: \`Bearer \${process.env.CLIPELLE_API_KEY}\` },
    });
    const { project } = await res.json();
    if (project.status === "completed") {
      const done = project.translations.filter((t) => t.status === "completed");
      // Links are valid for about an hour.
      return Object.fromEntries(done.map((t) => [t.language, t.videoUrl]));
    }
    if (project.status === "failed") {
      const step = project.steps.find((s) => s.error);
      throw new Error(step?.error ?? "The translation failed.");
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
}`;

const webhookPayload = `{
  "id": "7a1c…",                 // delivery id, also in X-Clipelle-Delivery
  "event": "project.completed",  // or project.failed
  "createdAt": "2026-11-23T14:02:11.000Z",
  "data": { ...the project as GET /api/v1/projects/{id} returns it }
}`;

const webhookVerify = `import { createHmac, timingSafeEqual } from "node:crypto";

// Read the RAW body (not re-serialised JSON).
export function verifyClipelle(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=")),
  );
  const t = Number(parts.t);
  // 5-minute window
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest("hex");
  if (parts.v1?.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

// Express-style handler
app.post(
  "/clipelle/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const raw = req.body.toString("utf8");
    const signature = req.get("X-Clipelle-Signature") ?? "";
    const secret = process.env.CLIPELLE_WEBHOOK_SECRET;
    if (!verifyClipelle(raw, signature, secret)) return res.sendStatus(401);
    const { id, event, data } = JSON.parse(raw);
    // Answer fast and do the work afterwards. The same delivery can
    // arrive more than once: dedupe on its id.
    res.sendStatus(200);
  },
);`;

const errorExample = `{
  "error": {
    "code": "insufficient_credits",
    "message": "You need 84 credits for this video and have 12."
  }
}`;

const curlAd = `curl -X POST ${BASE}/api/v1/ads \\
  -H "Authorization: Bearer rl_your_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1234" \\
  -d '{
    "name": "Nimbus bottle, spring ad",
    "productName": "Nimbus 750 ml insulated bottle",
    "description": "Double-walled steel bottle. Cold for 24 hours, hot for 12.",
    "productUrl": "https://yourshop.com/products/nimbus-750",
    "images": [{ "url": "https://yourshop.com/images/nimbus-front.jpg" }],
    "seconds": 30,
    "quality": "standard",
    "language": "en",
    "tone": "direct",
    "offer": "Free shipping this week"
  }'`;

const adResponse = `{
  "project": {
    "id": "7c0d…",
    "kind": "ad",
    "name": "Nimbus bottle, spring ad",
    "status": "processing",
    "createdAt": "2026-11-23T10:00:00.000Z",
    "steps": [
      { "key": "script", "label": "${config.stepLabels.script}", "status": "processing" },
      { "key": "productClip", "label": "${config.stepLabels.productClip}", "status": "waiting" },
      { "key": "presenter", "label": "${config.stepLabels.presenter}", "status": "waiting" },
      { "key": "finalEdit", "label": "${config.stepLabels.finalEdit}", "status": "waiting" }
    ],
    "result": {},
    "ad": { "seconds": 30, "quality": "standard", "language": "en" }
  }
}`;

const ERRORS: [string, string, string][] = [
  ["400", "validation_error", "A field is missing or out of range; details lists the paths."],
  ["401", "unauthorized", "No key, an unknown key, or a revoked key."],
  ["402", "insufficient_credits", "The video needs more credits than the workspace has."],
  ["403", "plan_required", "The plan does not include the API or the option you asked for."],
  ...(config.features.ads ? [] : ([["403", "coming_soon", "Ads from a photo are not open yet."]] as [string, string, string][])),
  ["404", "not_found", "No such project for this account."],
  ["409", "idempotency_mismatch", "The Idempotency-Key was used with a different body."],
  ["409", "budget_exceeded", "This video would use more credits than your limit allows, or a daily or monthly limit was reached."],
  ["413 / 415", "file_too_large, file_content_type", "A linked file is too large or not a video or image."],
  ["429", "rate_limited", "Too many requests for this key; Retry-After says when."],
  ["500", "server_error", "Something failed on our side; retry with the same Idempotency-Key."],
  ["503", "unavailable", "The API is not available right now; try again later."],
];

const code = "font-mono";

/** The ad endpoint: the full section when ads are open, a folded description while they are coming soon. */
function AdFields() {
  return (
    <>
      <p><code className={code}>POST /api/v1/ads</code> creates the ad and starts it. The body takes the same fields as the form; image links must be public (PNG, JPG or WebP, up to 10 MB each, at most 5). The response is <code className={code}>201</code> with the project; read it until <code className={code}>status</code> is <code className={code}>completed</code>, then take <code className={code}>result.videoUrl</code>.</p>
      <CodeBlock code={curlAd} lang="bash" title="curl" />
      <h3>Fields</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li><code className={code}>name</code> (2–120), <code className={code}>productName</code> (1–120), <code className={code}>description</code> (20–4000 characters; the script is written from it).</li>
        <li><code className={code}>images</code>: 1–5 objects with a public <code className={code}>url</code>. Optional <code className={code}>logo</code> and <code className={code}>background</code> objects with a <code className={code}>url</code>.</li>
        <li><code className={code}>seconds</code>: one of {AD_LENGTHS.join(", ")} (default 30). <code className={code}>quality</code>: <code className={code}>standard</code> (default) or <code className={code}>premium</code>.</li>
        <li><code className={code}>language</code>, <code className={code}>accent</code>, <code className={code}>voiceId</code>, <code className={code}>lookId</code>, <code className={code}>speed</code> (<code className={code}>slower</code>, <code className={code}>normal</code>, <code className={code}>faster</code>): the same options the form offers; leave them out for the defaults.</li>
        <li><code className={code}>tone</code> (<code className={code}>elegant</code>, <code className={code}>playful</code>, <code className={code}>direct</code>, <code className={code}>warm</code>), <code className={code}>offer</code> (80), <code className={code}>direction</code> (200), <code className={code}>script</code> (your own text instead of a written one), <code className={code}>productUrl</code>, <code className={code}>backgroundColor</code> (hex), <code className={code}>brand</code> with <code className={code}>accent</code>, <code className={code}>captionStyle</code>, <code className={code}>font</code>.</li>
        <li><code className={code}>format</code>: a preset from the format library (<code className={code}>unboxing</code>, <code className={code}>testimonial</code>, <code className={code}>before-after</code>, <code className={code}>problem-fix</code>, <code className={code}>three-reasons</code>, <code className={code}>product-demo</code>, <code className={code}>founder-story</code>, <code className={code}>offer</code>). It is stored on the project; send the matching <code className={code}>direction</code> and <code className={code}>tone</code> yourself (the app form does that for you), the API does not rewrite your fields.</li>
      </ul>
      <p>Script review is a form-only feature: an API project is made in one go.</p>
      <CodeBlock code={adResponse} lang="json" title="Response" />
    </>
  );
}

export default function ApiDocsPage() {
  return (
    <DocsLayout current="/docs/api" sections={sections}>
      <header>
        <h1 className="text-display">{config.productName} API</h1>
        <p className="mt-4 max-w-2xl">Translate videos you own from your own code. A key is your workspace: the same credits, limits and projects. Keys are made on <Link href={viaLogin("/app/settings/api")} className="underline">Settings → API keys</Link>, on plans that include the API.</p>
      </header>

      <section id="auth" className="space-y-4">
        <h2>Authentication</h2>
        <p>Send the key as a bearer token on every request. Every key starts with <code className={code}>rl_</code>, is shown once when created, and can be revoked at any time. Requests without a valid key get <code className={code}>401 unauthorized</code>; a key on a plan without the API gets <code className={code}>403 plan_required</code>.</p>
        <CodeBlock code={`Authorization: Bearer rl_your_key`} lang="http" title="Header" />
      </section>

      <section id="translations" className="space-y-4">
        <h2>Translate a video</h2>
        <p><code className={code}>POST /api/v1/translations</code> downloads the video from a public link (MP4, WebM or QuickTime, up to {config.limits.translateVideoMaxMb} MB and {config.limits.translateVideoMaxSeconds} seconds) and translates it into every language in <code className={code}>targetLanguages</code>. <code className={code}>rightsConfirmed</code> must be <code className={code}>true</code>: by sending it you confirm you own the video and have the speaker&apos;s permission to use their voice and face. <code className={code}>video.durationSeconds</code> is the length of the file; the credits follow from it. The response is <code className={code}>201</code> with the project.</p>
        <CodeBlock code={curlTranslate} lang="bash" title="curl" />
        <CodeBlock code={jsTranslate} lang="javascript" title="JavaScript (Node 18+)" />
        <CodeBlock code={translateResponse} lang="json" title="Response" />
        <h3>Fields</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><code className={code}>name</code> (2–120 characters), <code className={code}>video</code> with a public <code className={code}>url</code> and <code className={code}>durationSeconds</code>.</li>
          <li><code className={code}>sourceLanguage</code>: <code className={code}>auto</code> or a language code. <code className={code}>targetLanguages</code>: 1–20 codes, never the spoken language. Codes are the ones the form offers: <code className={code}>en</code>, <code className={code}>nl</code>, <code className={code}>de</code>, <code className={code}>fr</code>, <code className={code}>sk</code>, and the lower-case name for every other language or regional variant, such as <code className={code}>spanish</code> or <code className={code}>english-uk</code>.</li>
          <li><code className={code}>quality</code>: <code className={code}>speed</code> (1 credit per second, per language) or <code className={code}>precision</code> (2). <code className={code}>format</code>: <code className={code}>9:16</code> or <code className={code}>original</code>. <code className={code}>enhance</code>: true or false (a sharper picture, 1 credit per second more).</li>
          <li><code className={code}>keepTerms</code>: up to 20 words to keep as they are. <code className={code}>replaceTerms</code>: up to 10 pairs <code className={code}>{"{ from, to }"}</code>, say <code className={code}>to</code> wherever the video says <code className={code}>from</code>. <code className={code}>instructions</code>: wishes for the wording, up to 300 characters.</li>
          <li><code className={code}>captionPosition</code>: <code className={code}>low</code> (default) or <code className={code}>middle</code>. <code className={code}>captionStyle</code>, every key optional: <code className={code}>show</code> true or false, <code className={code}>highlight</code> (<code className={code}>box</code>, <code className={code}>color</code>, <code className={code}>underline</code> or <code className={code}>none</code>), <code className={code}>color</code> and <code className={code}>textColor</code> as #RRGGBB, <code className={code}>bar</code> behind the captions (<code className={code}>none</code>, <code className={code}>white</code>, <code className={code}>cream</code>, <code className={code}>yellow</code>, <code className={code}>dark</code> or #RRGGBB), <code className={code}>size</code> (<code className={code}>small</code>, <code className={code}>medium</code>, <code className={code}>large</code>), <code className={code}>uppercase</code> true or false.</li>
          <li><code className={code}>removeMusic</code> and <code className={code}>cleanVoice</code> (true or false), <code className={code}>trimSilence</code> (default false; a new picture at the start or end is always kept), <code className={code}>removeText</code> (paints out text burned into the picture; 1 credit per second more, per language).</li>
        </ul>
      </section>

      {config.features.ads && (
        <section id="ads" className="space-y-4">
          <h2>Create an ad</h2>
          <AdFields />
        </section>
      )}

      <section id="projects" className="space-y-4">
        <h2>Read projects</h2>
        <p><code className={code}>GET /api/v1/projects?limit=50</code> lists your projects, newest first (limit 1–100). <code className={code}>GET /api/v1/projects/&#123;id&#125;</code> returns one. Someone else&apos;s project is a <code className={code}>404</code>, never a <code className={code}>403</code>. A translation carries one entry per language under <code className={code}>translations</code>, each with its own <code className={code}>status</code> and, once it is ready, its <code className={code}>videoUrl</code>. Links are signed and valid for about an hour; fetch the project again for a fresh one.</p>
        <CodeBlock code={jsPoll} lang="javascript" title="Reading until the videos are ready" />
        <p>Statuses: <code className={code}>processing</code>, <code className={code}>completed</code>, <code className={code}>failed</code> (a step carries a plain-language <code className={code}>error</code>), <code className={code}>needs_input</code> (a form project waiting for you), <code className={code}>draft</code>. Step keys are generic: <code className={code}>upload</code>, <code className={code}>translate</code> and <code className={code}>captions</code> for a translation.</p>
      </section>

      <section id="webhooks" className="space-y-4">
        <h2>Webhooks</h2>
        <p>Instead of reading the project again and again, let us call you. In <Link href={viaLogin("/app/settings/api")} className="underline underline-offset-4">Settings → API keys → Webhooks</Link> add a public <code className={code}>https://</code> URL and pick the events <code className={code}>project.completed</code> and <code className={code}>project.failed</code>. The signing secret is shown once.</p>
        <CodeBlock code={webhookPayload} lang="json" title="Payload" />
        <p>Every call carries <code className={code}>X-Clipelle-Signature: t=&lt;unix seconds&gt;,v1=&lt;hex&gt;</code>, where v1 is the HMAC-SHA256 of <code className={code}>&quot;t.&quot; + raw body</code> with your secret, plus <code className={code}>X-Clipelle-Event</code> and <code className={code}>X-Clipelle-Delivery</code>. Check it like this:</p>
        <CodeBlock code={webhookVerify} lang="javascript" title="Verifying the signature (Node)" />
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
          <li>Answer with any 2xx within 10 seconds. Anything else is retried with backoff, five more times over about a day; after that the delivery is marked failed and can be sent again from Settings.</li>
          <li>A delivery can arrive more than once (a slow answer counts as a failure). Deduplicate on <code className={code}>id</code>.</li>
          <li>Redirects are not followed; private addresses and plain http are refused when you add the URL.</li>
        </ul>
      </section>

      <section id="idempotency" className="space-y-4">
        <h2>Idempotency</h2>
        <p>Send an <code className={code}>Idempotency-Key</code> header (up to 200 characters, unique per request you mean) when you create a video. A retry with the same key and the same body returns the project made the first time with <code className={code}>200</code> instead of making a second video. The same key with a different body is refused with <code className={code}>409 idempotency_mismatch</code>. Keys are scoped to the API key that sent them.</p>
      </section>

      <section id="errors" className="space-y-4">
        <h2>Errors</h2>
        <p>Every error is JSON with a stable <code className={code}>code</code> and a message you can show to a person.</p>
        <CodeBlock code={errorExample} lang="json" title="Error shape" />
        {/* A table from sm, stacked rows on phones: the codes are long and used to be cut off at 390 px. */}
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          <div className="hidden grid-cols-[92px_minmax(0,250px)_minmax(0,1fr)] gap-x-4 bg-surface-muted px-4 py-2.5 text-[13px] font-medium text-muted sm:grid" aria-hidden>
            <span>Status</span><span>Code</span><span>Meaning</span>
          </div>
          <ul className="divide-y divide-divider">
            {ERRORS.map(([status, name, meaning]) => (
              <li key={name} className="grid gap-x-4 gap-y-1 px-4 py-3 !text-[14px] sm:grid-cols-[92px_minmax(0,250px)_minmax(0,1fr)]">
                <span className="font-mono text-ink">{status}<span className="sm:hidden"> · {name}</span></span>
                <span className="hidden break-words font-mono text-ink sm:block">{name}</span>
                <span className="text-ink/85">{meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="limits" className="space-y-4">
        <h2>Limits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>60 requests per minute per key. Creating a video also counts towards your workspace&apos;s daily and monthly limits.</li>
          <li>Linked files: public http(s) links only; private or internal addresses are refused; at most 3 redirects; videos up to {config.limits.translateVideoMaxMb} MB.</li>
          <li>Credits are exactly those of the form; the project page shows the credits really used.</li>
          <li>Result links expire after about an hour; read the project again for a fresh one, or use a webhook to hear when a video is ready.</li>
        </ul>
        <p>Want an assistant to call the API for you? See the <Link href="/docs/mcp" className="underline">MCP server</Link>.</p>
      </section>

      {!config.features.ads && (
        <section id="ads" className="space-y-4">
          <h2>Ads from a photo (soon)</h2>
          <SoonCallout>Ads from a photo are not open yet: <code className={code}>POST /api/v1/ads</code> answers <code className={code}>403 coming_soon</code>. Translations work today.</SoonCallout>
          <details className="group rounded-card bg-surface shadow-card">
            <summary className="focus-ring cursor-pointer list-none rounded-card px-5 py-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">Show the planned request <span className="text-muted group-open:hidden">+</span><span className="hidden text-muted group-open:inline">−</span></summary>
            <div className="space-y-4 px-5 pb-5"><AdFields /></div>
          </details>
        </section>
      )}
    </DocsLayout>
  );
}
