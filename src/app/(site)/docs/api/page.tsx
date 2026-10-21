import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/site/CodeBlock";
import { DocsLayout } from "@/components/site/DocsLayout";
import { AD_LENGTHS } from "@/lib/pricing";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "API documentation", description: "Create ads and translations from your own code: endpoints, examples in curl and JavaScript, error codes and limits." };

const sections = [
  { id: "auth", label: "Authentication" },
  { id: "ads", label: "Create an ad" },
  { id: "translations", label: "Translate a video" },
  { id: "projects", label: "Read projects" },
  { id: "idempotency", label: "Idempotency" },
  { id: "errors", label: "Errors" },
  { id: "webhooks", label: "Webhooks" },
  { id: "limits", label: "Limits" },
];

const webhookPayload = `{
  "id": "7a1c…",                       // delivery id, also in X-Reelay-Delivery
  "event": "project.completed",         // or project.failed
  "createdAt": "2026-10-21T14:02:11.000Z",
  "data": { ...the project exactly as GET /api/v1/projects/{id} returns it }
}`;

const webhookVerify = `import { createHmac, timingSafeEqual } from "node:crypto";

// Express-style handler: read the RAW body (not re-serialised JSON).
export function verifyReelay(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false; // 5-minute window
  const expected = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return parts.v1?.length === expected.length && timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

app.post("/reelay/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!verifyReelay(req.body.toString("utf8"), req.get("X-Reelay-Signature") ?? "", process.env.REELAY_WEBHOOK_SECRET)) return res.sendStatus(401);
  const { event, data } = JSON.parse(req.body.toString("utf8"));
  // Answer fast; do the work afterwards. The same delivery can arrive more than once: dedupe on its id.
  res.sendStatus(200);
});`;

const curlAd = `curl -X POST https://YOUR-DOMAIN/api/v1/ads \\
  -H "Authorization: Bearer rl_your_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1234" \\
  -d '{
    "name": "Nimbus bottle, spring ad",
    "productName": "Nimbus 750 ml insulated bottle",
    "description": "Double-walled steel bottle that keeps drinks cold for 24 hours and hot for 12. Fits a car cup holder.",
    "productUrl": "https://yourshop.com/products/nimbus-750",
    "images": [{ "url": "https://yourshop.com/images/nimbus-front.jpg" }],
    "seconds": 30,
    "quality": "standard",
    "language": "en",
    "tone": "direct",
    "offer": "Free shipping this week"
  }'`;

const jsAd = `const res = await fetch("https://YOUR-DOMAIN/api/v1/ads", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.REELAY_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "order-1234",
  },
  body: JSON.stringify({
    name: "Nimbus bottle, spring ad",
    productName: "Nimbus 750 ml insulated bottle",
    description: "Double-walled steel bottle that keeps drinks cold for 24 hours and hot for 12.",
    images: [{ url: "https://yourshop.com/images/nimbus-front.jpg" }],
    seconds: 30,
    quality: "standard",
    language: "en",
  }),
});
const { project, error } = await res.json();
if (!res.ok) throw new Error(\`\${error.code}: \${error.message}\`);
console.log(project.id, project.status); // "processing"`;

const curlTranslate = `curl -X POST https://YOUR-DOMAIN/api/v1/translations \\
  -H "Authorization: Bearer rl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Explainer, German and French",
    "video": { "url": "https://yourcdn.com/explainer.mp4", "durationSeconds": 42 },
    "sourceLanguage": "auto",
    "targetLanguages": ["de", "fr"],
    "quality": "speed",
    "format": "9:16",
    "enhance": false,
    "rightsConfirmed": true
  }'`;

const jsPoll = `async function waitForVideo(id) {
  for (;;) {
    const res = await fetch(\`https://YOUR-DOMAIN/api/v1/projects/\${id}\`, {
      headers: { Authorization: \`Bearer \${process.env.REELAY_API_KEY}\` },
    });
    const { project } = await res.json();
    if (project.status === "completed") return project.result.videoUrl; // valid for about an hour
    if (project.status === "failed") throw new Error(project.steps.find((s) => s.error)?.error ?? "failed");
    await new Promise((r) => setTimeout(r, 15_000));
  }
}`;

const responseExample = `{
  "project": {
    "id": "7c0d…",
    "kind": "ad",
    "name": "Nimbus bottle, spring ad",
    "status": "processing",
    "createdAt": "2026-10-21T10:00:00.000Z",
    "steps": [
      { "key": "script", "label": "AI script", "status": "processing" },
      { "key": "productClip", "label": "AI product footage", "status": "waiting" },
      { "key": "presenter", "label": "AI presenter", "status": "waiting" },
      { "key": "finalEdit", "label": "Captions and 9:16", "status": "waiting" }
    ],
    "result": {},
    "ad": { "seconds": 30, "quality": "standard", "language": "en" }
  }
}`;

const errorExample = `{ "error": { "code": "insufficient_credits", "message": "You need 30 credits for this video and have 12. Add a credit pack or wait for your next month." } }`;

export default function ApiDocsPage() {
  return (
    <DocsLayout current="/docs/api" sections={sections}>
      <header>
        <p className="label-mono text-muted">API v1</p>
        <h1 className="mt-3 text-display">The {config.productName} API</h1>
        <p className="mt-4 max-w-2xl">Everything the form can do, from your own code: create an ad from a product and image links, translate a video you own, and read the result. A key acts as your account: the same credits, the same cost limits, the same projects on your dashboard. Keys are made on <Link href="/settings/api" className="underline">Settings → API keys</Link> and come with a plan that includes credits.</p>
      </header>

      <section id="auth" className="space-y-4">
        <h2>Authentication</h2>
        <p>Send the key as a bearer token on every request. Keys start with <code className="font-mono">rl_</code>, are shown once when created, and can be revoked at any time. Requests without a valid key get <code className="font-mono">401 unauthorized</code>; a key on an account without a plan gets <code className="font-mono">403 plan_required</code>.</p>
        <CodeBlock code={`Authorization: Bearer rl_your_key`} lang="http" title="Header" />
      </section>

      <section id="ads" className="space-y-4">
        <h2>Create an ad</h2>
        <p><code className="font-mono">POST /api/v1/ads</code> creates the ad and starts it. The body takes the same fields as the form; image links must be public (PNG, JPG or WebP, up to 10 MB each, at most 5). The response is <code className="font-mono">201</code> with the project; poll it until <code className="font-mono">status</code> is <code className="font-mono">completed</code>.</p>
        <CodeBlock code={curlAd} lang="bash" title="curl" />
        <CodeBlock code={jsAd} lang="javascript" title="JavaScript (Node 18+)" />
        <h3>Fields</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><code className="font-mono">name</code> (2–120), <code className="font-mono">productName</code> (1–120), <code className="font-mono">description</code> (20–4000 characters; the script is written from it).</li>
          <li><code className="font-mono">images</code>: 1–5 objects with a public <code className="font-mono">url</code>. Optional <code className="font-mono">logo</code> and <code className="font-mono">background</code> objects with a <code className="font-mono">url</code>.</li>
          <li><code className="font-mono">seconds</code>: one of {AD_LENGTHS.join(", ")} (default 30). <code className="font-mono">quality</code>: <code className="font-mono">standard</code> (default) or <code className="font-mono">premium</code>.</li>
          <li><code className="font-mono">language</code>, <code className="font-mono">accent</code>, <code className="font-mono">voiceId</code>, <code className="font-mono">lookId</code>, <code className="font-mono">speed</code> (<code className="font-mono">slower</code>, <code className="font-mono">normal</code>, <code className="font-mono">faster</code>): the same options the form offers; leave them out for the defaults.</li>
          <li><code className="font-mono">tone</code> (<code className="font-mono">elegant</code>, <code className="font-mono">playful</code>, <code className="font-mono">direct</code>, <code className="font-mono">warm</code>), <code className="font-mono">offer</code> (80), <code className="font-mono">direction</code> (200), <code className="font-mono">script</code> (your own text instead of a written one), <code className="font-mono">productUrl</code>, <code className="font-mono">backgroundColor</code> (hex), <code className="font-mono">brand</code> with <code className="font-mono">accent</code>, <code className="font-mono">captionStyle</code>, <code className="font-mono">font</code>.</li>
          <li><code className="font-mono">format</code>: a preset from the format library (<code className="font-mono">unboxing</code>, <code className="font-mono">testimonial</code>, <code className="font-mono">before-after</code>, <code className="font-mono">problem-fix</code>, <code className="font-mono">three-reasons</code>, <code className="font-mono">product-demo</code>, <code className="font-mono">founder-story</code>, <code className="font-mono">offer</code>). It is stored on the project; send the matching <code className="font-mono">direction</code> and <code className="font-mono">tone</code> yourself (the app form does that for you), the API does not rewrite your fields.</li>
        </ul>
        <p>Script review is a form-only feature: an API project is made in one go.</p>
        <CodeBlock code={responseExample} lang="json" title="Response" />
      </section>

      <section id="translations" className="space-y-4">
        <h2>Translate a video</h2>
        <p><code className="font-mono">POST /api/v1/translations</code> downloads the video from a public link (MP4, WebM or QuickTime, up to {config.limits.translateVideoMaxMb} MB and {config.limits.translateVideoMaxSeconds} seconds) and translates it into every language in <code className="font-mono">targetLanguages</code>. <code className="font-mono">rightsConfirmed</code> must be <code className="font-mono">true</code>: by sending it you confirm you own the video and have the speaker&apos;s permission to use their voice and face. <code className="font-mono">video.durationSeconds</code> is the length of the file; the estimate and the credits follow from it.</p>
        <CodeBlock code={curlTranslate} lang="bash" title="curl" />
        <p>Options: <code className="font-mono">quality</code> (<code className="font-mono">speed</code> or <code className="font-mono">precision</code>), <code className="font-mono">format</code> (<code className="font-mono">9:16</code> or <code className="font-mono">original</code>), <code className="font-mono">enhance</code>, <code className="font-mono">keepTerms</code> (up to 20 words to keep as they are), <code className="font-mono">trimSilence</code>, <code className="font-mono">captionPosition</code> (<code className="font-mono">low</code> or <code className="font-mono">middle</code>). Language codes are the ones the form offers.</p>
      </section>

      <section id="projects" className="space-y-4">
        <h2>Read projects</h2>
        <p><code className="font-mono">GET /api/v1/projects?limit=50</code> lists your projects, newest first (limit 1–100). <code className="font-mono">GET /api/v1/projects/&#123;id&#125;</code> returns one. Someone else&apos;s project is a <code className="font-mono">404</code>, never a <code className="font-mono">403</code>. Result links are signed and valid for about an hour (<code className="font-mono">result.expiresInSeconds</code>); fetch the project again for a fresh link.</p>
        <CodeBlock code={jsPoll} lang="javascript" title="Polling until the video is ready" />
        <p>Statuses: <code className="font-mono">processing</code>, <code className="font-mono">completed</code>, <code className="font-mono">failed</code> (a step carries a plain-language <code className="font-mono">error</code>), <code className="font-mono">needs_input</code> (a form project waiting for a review), <code className="font-mono">draft</code>. Step keys are generic: <code className="font-mono">script</code>, <code className="font-mono">productClip</code>, <code className="font-mono">presenter</code>, <code className="font-mono">finalEdit</code> for ads; <code className="font-mono">upload</code>, <code className="font-mono">translate</code>, <code className="font-mono">captions</code> for translations, with one entry per language under <code className="font-mono">translations</code>.</p>
      </section>

      <section id="idempotency" className="space-y-4">
        <h2>Idempotency</h2>
        <p>Send an <code className="font-mono">Idempotency-Key</code> header (up to 200 characters, unique per request you mean) on the two create calls. A retry with the same key and the same body returns the project made the first time with <code className="font-mono">200</code> instead of making a second video. The same key with a different body is refused with <code className="font-mono">409 idempotency_mismatch</code>. Keys are scoped to the API key that sent them.</p>
      </section>

      <section id="errors" className="space-y-4">
        <h2>Errors</h2>
        <p>Every error is JSON with a stable <code className="font-mono">code</code> and a message you can show to a person.</p>
        <CodeBlock code={errorExample} lang="json" title="Error shape" />
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Code</th><th className="px-4 py-2.5 font-medium">Meaning</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {[
                ["400", "validation_error", "A field is missing or out of range; details lists the paths."],
                ["401", "unauthorized", "No key, an unknown key, or a revoked key."],
                ["402", "insufficient_credits", "The project needs more credits than the account has."],
                ["403", "plan_required", "The account has no plan with credits (or only the free plan)."],
                ["404", "not_found", "No such project for this account."],
                ["409", "idempotency_mismatch", "The Idempotency-Key was used with a different body."],
                ["409", "budget_exceeded", "The estimate is above the per-video budget, or a spend limit was reached."],
                ["413 / 415", "file_too_large / file_content_type", "A linked file is too large or not an image/video."],
                ["429", "rate_limited", "Too many requests for this key; Retry-After says when."],
                ["500", "server_error", "Something failed on our side; retry with the same Idempotency-Key."],
                ["503", "unavailable", "The API is off while the server runs in demo mode."],
              ].map(([s, c, m]) => (
                <tr key={c}><td className="px-4 py-2.5 font-mono text-ink">{s}</td><td className="px-4 py-2.5 font-mono text-ink">{c}</td><td className="px-4 py-2.5 text-ink/85">{m}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="webhooks" className="space-y-4">
        <h2>Webhooks</h2>
        <p>Instead of polling, let us call you. In <Link href="/settings/api" className="underline underline-offset-4">Settings → API keys → Webhooks</Link> add a public <code className="font-mono">https://</code> URL and pick the events <code className="font-mono">project.completed</code> and <code className="font-mono">project.failed</code>. The signing secret is shown once.</p>
        <CodeBlock code={webhookPayload} lang="json" title="Payload" />
        <p>Every call carries <code className="font-mono">X-Reelay-Signature: t=&lt;unix seconds&gt;,v1=&lt;hex&gt;</code>, where v1 is the HMAC-SHA256 of <code className="font-mono">&quot;t.&quot; + raw body</code> with your secret, plus <code className="font-mono">X-Reelay-Event</code> and <code className="font-mono">X-Reelay-Delivery</code>. Check it like this:</p>
        <CodeBlock code={webhookVerify} lang="javascript" title="Verifying the signature (Node)" />
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
          <li>Answer with any 2xx within 10 seconds. Anything else is retried with backoff, five more times over about a day; after that the delivery is marked failed and can be sent again from Settings.</li>
          <li>A delivery can arrive more than once (a slow answer counts as a failure). Deduplicate on <code className="font-mono">id</code>.</li>
          <li>Redirects are not followed; private addresses and plain http are refused when you add the URL.</li>
        </ul>
      </section>

      <section id="limits" className="space-y-4">
        <h2>Limits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>60 requests per minute per key. Creating a video also counts towards your account&apos;s daily and monthly spend limits.</li>
          <li>Linked files: public http(s) links only; private or internal addresses are refused; at most 3 redirects; images 10 MB, logos 2 MB, videos {config.limits.translateVideoMaxMb} MB.</li>
          <li>Credits and costs are exactly those of the form; the project page in Studio shows the real amount afterwards.</li>
          <li>No webhooks yet: poll the project. Result links expire after about an hour.</li>
        </ul>
        <p>Want an assistant to call the API for you? See the <Link href="/docs/mcp" className="underline">MCP server</Link>.</p>
      </section>
    </DocsLayout>
  );
}
