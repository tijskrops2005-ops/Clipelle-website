#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Reelay MCP server (stdio). Four tools that call the public API v1 with the key from the
 * environment: create_ad, translate_video, get_project, list_projects. Nothing is stored here;
 * every video is a normal project on the account's dashboard with the same credits and limits.
 *
 * Environment: CLIPELLE_API_KEY (required) and CLIPELLE_API_URL (the base URL of your Clipelle
 * account's app, e.g. the address shown in Settings → API keys; the older REELAY_* names still
 * work for one release).
 */
const API_URL = (process.env.CLIPELLE_API_URL ?? process.env.REELAY_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const API_KEY = (process.env.CLIPELLE_API_KEY ?? process.env.REELAY_API_KEY);

async function call(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string) {
  if (!API_KEY) return { ok: false, status: 0, body: { error: { code: "no_key", message: "Set CLIPELLE_API_KEY in the server's environment (Settings → API keys in Reelay)." } } };
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: { code: "bad_response", message: `The API answered ${res.status} without JSON.` } }));
  return { ok: res.ok, status: res.status, body: json };
}

const asText = (r: { ok: boolean; status: number; body: unknown }) => ({ content: [{ type: "text" as const, text: JSON.stringify(r.body, null, 2) }], isError: !r.ok });

const server = new McpServer({ name: "reelay", version: "0.1.0" });

server.registerTool(
  "create_ad",
  {
    title: "Create a product ad",
    description: "Creates a 9:16 video ad from a product name, description and public image links. Spends credits on the Reelay account. Returns the project id and status; use get_project to follow it.",
    inputSchema: {
      name: z.string().min(2).max(120).describe("Project name shown in Studio"),
      productName: z.string().min(1).max(120),
      description: z.string().min(20).max(4000).describe("What it is, who it is for, why it is better; the script is written from this"),
      images: z.array(z.string().url()).min(1).max(5).describe("Public image URLs (PNG, JPG, WebP)"),
      productUrl: z.string().url().optional(),
      seconds: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]).optional().describe("Ad length, default 30"),
      quality: z.enum(["standard", "premium"]).optional().describe("Presenter quality, default standard"),
      language: z.string().optional().describe("Language code such as en, nl, de"),
      tone: z.enum(["elegant", "playful", "direct", "warm"]).optional(),
      offer: z.string().max(80).optional().describe("A deal the call to action may mention"),
      direction: z.string().max(200).optional().describe("Audience or emphasis for the script"),
      script: z.string().max(5000).optional().describe("Your own spoken script instead of a written one"),
      idempotencyKey: z.string().max(200).optional().describe("Reuse the same key on a retry so no second video is made"),
    },
  },
  async ({ images, idempotencyKey, ...rest }) => asText(await call("POST", "/api/v1/ads", { ...rest, images: images.map((url) => ({ url })) }, idempotencyKey)),
);

server.registerTool(
  "translate_video",
  {
    title: "Translate a video",
    description: "Translates a video you own (public link) into other languages with the speaker's own voice and matching lips. Requires rightsConfirmed=true. Spends credits.",
    inputSchema: {
      name: z.string().min(2).max(120),
      videoUrl: z.string().url().describe("Public MP4/WebM/QuickTime link, up to 32 MB"),
      durationSeconds: z.number().positive().max(180),
      sourceLanguage: z.string().optional().describe('Spoken language code, or "auto" (default)'),
      targetLanguages: z.array(z.string()).min(1).max(20),
      quality: z.enum(["speed", "precision"]).optional(),
      format: z.enum(["9:16", "original"]).optional(),
      enhance: z.boolean().optional(),
      keepTerms: z.array(z.string()).max(20).optional(),
      rightsConfirmed: z.literal(true).describe("You own the video and have the speaker's permission to use their voice and face"),
      idempotencyKey: z.string().max(200).optional(),
    },
  },
  async ({ videoUrl, durationSeconds, idempotencyKey, sourceLanguage, quality, format, enhance, ...rest }) =>
    asText(await call("POST", "/api/v1/translations", { ...rest, video: { url: videoUrl, durationSeconds }, sourceLanguage: sourceLanguage ?? "auto", quality: quality ?? "speed", format: format ?? "9:16", enhance: enhance ?? false }, idempotencyKey)),
);

server.registerTool(
  "get_project",
  { title: "Get a project", description: "Status, steps and the result link (valid about an hour) of one project.", inputSchema: { id: z.string().describe("Project id") } },
  async ({ id }) => asText(await call("GET", `/api/v1/projects/${encodeURIComponent(id)}`)),
);

server.registerTool(
  "list_projects",
  { title: "List projects", description: "The most recent projects on the account.", inputSchema: { limit: z.number().int().min(1).max(100).optional() } },
  async ({ limit }) => asText(await call("GET", `/api/v1/projects?limit=${limit ?? 20}`)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
