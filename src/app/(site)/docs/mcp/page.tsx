import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/site/CodeBlock";
import { DocsLayout, SoonCallout } from "@/components/site/DocsLayout";
import { config } from "@/lib/config";
import { siteUrl, supportEmail } from "@/lib/brand";
import { viaLogin } from "@/components/site/siteNav";

export const metadata: Metadata = { title: "MCP server", description: "Let an AI assistant translate videos and read projects through the Model Context Protocol." };

const sections = [
  { id: "what", label: "What it is" },
  { id: "install", label: "Install" },
  { id: "configure", label: "Configure" },
  { id: "tools", label: "Tools" },
  { id: "safety", label: "Safety" },
];

const install = `# in the folder we send you
npm install
npm run build   # writes dist/index.js`;

/** The real site address (NEXT_PUBLIC_SITE_URL), never a placeholder host. */
const mcpConfig = `{
  "mcpServers": {
    "clipelle": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"],
      "env": {
        "CLIPELLE_API_KEY": "rl_your_key",
        "CLIPELLE_API_URL": "${siteUrl()}"
      }
    }
  }
}`;

const example = `You: Translate https://yourcdn.com/explainer.mp4 into German
     and French. It is 42 seconds, I own it and the speaker agreed.
Assistant → translate_video({
  name: "Explainer, German and French",
  videoUrl: "https://yourcdn.com/explainer.mp4",
  durationSeconds: 42,
  targetLanguages: ["de", "fr"],
  rightsConfirmed: true
})
Assistant: Started project 7c0d…; I will check back.
Assistant → get_project({ id: "7c0d…" })
Assistant: Both videos are ready: <one link per language,
     valid for about an hour>`;

export default function McpDocsPage() {
  const mail = supportEmail();
  return (
    <DocsLayout current="/docs/mcp" sections={sections}>
      <header>
        <h1 className="text-display">MCP server</h1>
        <p className="mt-4 max-w-2xl">A small server that speaks the Model Context Protocol and calls the <Link href="/docs/api" className="underline">{config.productName} API</Link> with your key. Any assistant that supports MCP over stdio can then translate videos and read projects for you, in a conversation.</p>
      </header>

      <section id="what" className="space-y-4">
        <h2>What it is</h2>
        <p>The server runs on your own machine, reads your API key from the environment and exposes a few tools. It never stores anything itself: every call goes to the API, and every video lands on your dashboard like any other project, with the same credits and limits.</p>
        <CodeBlock code={example} lang="text" title="A conversation" />
      </section>

      <section id="install" className="space-y-4">
        <h2>Install</h2>
        <p>The server is not published as a package yet. It is available on request: {mail ? <>write to <a href={`mailto:${mail}`} className="underline">{mail}</a></> : <><Link href="/contact" className="underline">send us a message</Link></>} and we send you the folder. You need Node 20 or newer.</p>
        <CodeBlock code={install} lang="bash" title="Build" />
      </section>

      <section id="configure" className="space-y-4">
        <h2>Configure</h2>
        <p>Make a key on <Link href={viaLogin("/settings/api")} className="underline">Settings → API keys</Link> (every key starts with <code className="font-mono">rl_</code>), then add the server to your assistant&apos;s MCP configuration. The shape below is what most desktop assistants use; the key stays in the environment, never in a prompt.</p>
        <CodeBlock code={mcpConfig} lang="json" title="MCP configuration" />
        <p>Set <code className="font-mono">CLIPELLE_API_URL</code> to the address above; without it the server looks for a local development build.</p>
      </section>

      <section id="tools" className="space-y-4">
        <h2>Tools</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><code className="font-mono">translate_video</code>: a public video link, its length in seconds, the target languages and the rights confirmation; returns the project.</li>
          <li><code className="font-mono">get_project</code>: status, steps and the result links of one project.</li>
          <li><code className="font-mono">list_projects</code>: your most recent projects.</li>
          {config.features.ads && <li><code className="font-mono">create_ad</code>: product name, description, public image links, length, quality, language and the optional choices; returns the project id and status.</li>}
        </ul>
        {!config.features.ads && <SoonCallout>Ads from a photo are not open yet: the fourth tool, <code className="font-mono">create_ad</code>, answers <code className="font-mono">403 coming_soon</code>. Translations work today.</SoonCallout>}
        <p>Every tool returns the API&apos;s JSON, so an assistant can read the status and the plain-language error of a failed step.</p>
      </section>

      <section id="safety" className="space-y-4">
        <h2>Safety</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Creating a video uses credits. Most assistants ask before running a tool; keep that on.</li>
          <li>The server only uses files you link to; nothing on your machine is uploaded.</li>
          <li>Revoke the key on Settings → API keys and the server stops working immediately.</li>
        </ul>
      </section>
    </DocsLayout>
  );
}
