import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/site/CodeBlock";
import { DocsLayout } from "@/components/site/DocsLayout";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "MCP server", description: "Let an AI assistant create ads, translate videos and read projects through the Model Context Protocol." };

const sections = [
  { id: "what", label: "What it is" },
  { id: "install", label: "Install" },
  { id: "configure", label: "Configure" },
  { id: "tools", label: "Tools" },
  { id: "safety", label: "Safety" },
];

const install = `git clone https://github.com/YOUR-ORG/clipelle.git
cd clipelle/mcp
npm install
npm run build   # writes dist/index.js`;

const mcpConfig = `{
  "mcpServers": {
    "clipelle": {
      "command": "node",
      "args": ["/absolute/path/to/clipelle/mcp/dist/index.js"],
      "env": {
        "CLIPELLE_API_KEY": "rl_your_key",
        "CLIPELLE_API_URL": "https://YOUR-DOMAIN"
      }
    }
  }
}`;

const example = `You: Make a 30-second ad for the Nimbus bottle. Photo: https://yourshop.com/images/nimbus-front.jpg
Assistant → create_ad({ name, productName, description, images: [{ url }], seconds: 30, quality: "standard" })
Assistant: Started project 7c0d…; I will check back.
Assistant → get_project({ id: "7c0d…" })
Assistant: The video is ready: <link, valid for about an hour>`;

export default function McpDocsPage() {
  return (
    <DocsLayout current="/docs/mcp" sections={sections}>
      <header>
        <p className="label-mono text-muted">MCP</p>
        <h1 className="mt-3 text-display">{config.productName} for AI assistants</h1>
        <p className="mt-4 max-w-2xl">A small server that speaks the Model Context Protocol and calls the <Link href="/docs/api" className="underline">{config.productName} API</Link> with your key. Any assistant that supports MCP over stdio can then create ads, translate videos and read projects for you, in a conversation.</p>
      </header>

      <section id="what" className="space-y-4">
        <h2>What it is</h2>
        <p>The server runs on your own machine, reads your API key from the environment and exposes four tools. It never stores anything itself: every call goes to the API, every video lands in your Studio like any other project, with the same credits and limits.</p>
        <CodeBlock code={example} lang="text" title="A conversation" />
      </section>

      <section id="install" className="space-y-4">
        <h2>Install</h2>
        <p>The server lives in the <code className="font-mono">mcp/</code> folder of the {config.productName} repository and is not published as a package. You need Node 20 or newer.</p>
        <CodeBlock code={install} lang="bash" title="Build" />
      </section>

      <section id="configure" className="space-y-4">
        <h2>Configure</h2>
        <p>Make a key on <Link href="/settings/api" className="underline">Settings → API keys</Link>, then add the server to your assistant&apos;s MCP configuration. The shape below is what most desktop assistants use; the key stays in the environment, never in a prompt.</p>
        <CodeBlock code={mcpConfig} lang="json" title="MCP configuration" />
        <p><code className="font-mono">CLIPELLE_API_URL</code> defaults to the public site when left out. For a local build of the app, point it at your dev server.</p>
      </section>

      <section id="tools" className="space-y-4">
        <h2>Tools</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><code className="font-mono">create_ad</code>: product name, description, public image links, length, quality, language and the optional choices; returns the project id and status.</li>
          <li><code className="font-mono">translate_video</code>: a public video link, its length in seconds, the target languages and the rights confirmation; returns the project.</li>
          <li><code className="font-mono">get_project</code>: status, steps and the result link of one project.</li>
          <li><code className="font-mono">list_projects</code>: your most recent projects.</li>
        </ul>
        <p>Every tool returns the API&apos;s JSON, so an assistant can read the status and the plain-language error of a failed step.</p>
      </section>

      <section id="safety" className="space-y-4">
        <h2>Safety</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Creating a video spends credits. Most assistants ask before running a tool; keep that on.</li>
          <li>The server only uses files you link to; nothing on your machine is uploaded.</li>
          <li>Revoke the key on Settings → API keys and the server stops working immediately.</li>
        </ul>
      </section>
    </DocsLayout>
  );
}
