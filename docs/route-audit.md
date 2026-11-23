# Route audit (24 Nov 2026)

Every public and app route, what it is for, its state after the clarity round and what was decided. Dev tools (`/dev/*`, `/api/dev/*`) and admin pages are left out: they answer 404 to non-admins outside development.

Classes: **keep** · **improved** (changed in this round) · **hidden** (reachable by URL, not in a menu) · **redirect** · **removed**.

## Public site (English at `/`, Dutch under `/nl`)

| Route | Purpose | State | Decision |
|---|---|---|---|
| `/` | Homepage: hero with real videos, the four steps, the before/after, calculator, plans, FAQ | real | keep |
| `/platform/translate` | What a translation does, steps, rights, quality, one real result | real | keep |
| `/platform/ads`, `/platform/url-to-video` | Ads from a photo / a link: announced, waitlist | coming soon, says so | keep as "Soon" in the Platform menu while `NEXT_PUBLIC_ADS_ENABLED` is off |
| `/examples` | Four real translations next to their originals | real | keep |
| `/pricing` | Plans, credits, calculator, managed service, FAQ | real | keep |
| `/integrations/api` | The public API, what it does and does not | real (keys, endpoints, webhooks) | **improved**: menu label "Developer API" |
| `/integrations/mcp` | The MCP server | real code in `mcp/`, not published as a package | **hidden**: out of the menus, linked from the API docs, in the sitemap |
| `/docs/api` | API reference | real | keep (Resources → API docs) |
| `/docs/mcp` | MCP reference | real, install on request | **hidden** from the menus, linked from `/docs/api` |
| `/solutions/ecommerce-brands`, `/solutions/agencies`, `/solutions/creators-and-localization` | Three audiences, one page each | real, short | keep (three more solution pages exist only with the ads flag) |
| `/resources` | Hub: Blog, Guides, FAQ, Changelog, API docs, Examples | real | **improved**: MCP docs and Partner program left the hub |
| `/blog`, `/blog/[slug]`, `/blog/category/*`, `/blog/tag/*` | 24 articles | real | keep |
| `/resources/guides`, `/resources/guides/[slug]` | Two guides | real | keep |
| `/resources/faq` | Questions and answers | real | keep |
| `/resources/changelog` | What changed | real | keep |
| `/partners` | Partner program, opens soon, waitlist | announced, says so | **moved** from Resources to Company |
| `/customers` | Customer stories | empty until the first story | **hidden**: not in menus or sitemap; honest empty state by URL |
| `/about`, `/contact`, `/press`, `/trust`, `/careers` | Company pages | real | keep (careers has no roles and says so; open application form) |
| `/demo` | Book a demo | real form | keep |
| `/services/done-for-you` | Managed service, request a call | real form, no prices | keep |
| `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/data`, `/legal/affiliate-terms` | Legal texts | real | keep |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify`, `/verify-2fa` | Accounts | real | keep |
| `/share/[token]` | Public viewing link | real | keep (noindex) |
| `/welcome` | Old landing page | redirects to `/` | keep redirect |
| `/mcp`, `/docs`, `/solutions`, `/integrations`, `/company`, `/creations`, `GET /api` | Bare section URLs people type | were 404 | **redirect** to the matching page (added 24 Nov 2026) |
| anything else | | | the site's own 404 page |

## App (signed in)

| Route | Purpose | State | Decision |
|---|---|---|---|
| `/dashboard` | Balance, what is running, getting started, recent videos | real | keep |
| `/new` | Chooser: Translate a video, Translate with a presenter; ads announced below | real | keep |
| `/new/translate` (`?speaker=presenter`) | The one form, both flows | real | keep |
| `/new/ad`, `/new/url` | Ads: coming-soon panel with "Notify me" | announced, server refuses starts | keep secondary (sidebar "Coming soon", folded) |
| `/projects`, `/projects/[id]`, `/projects/[id]/edit` | List, progress/result, edit screen | real | keep |
| `/edit` | Pick a finished video to edit | real | keep |
| `/batches/[id]` | Variations of an ad | ads only | keep (reachable from an ad batch only) |
| `/settings`, `/settings/brand`, `/settings/usage`, `/settings/billing`, `/settings/api`, `/settings/team` | Account | real | keep |
| `/settings/connections` | "Publish to TikTok / Reels / Shorts", "Import from Shopify" wishes | announcements only | **removed** from the menu; the route redirects to `/settings`; the notify API keeps accepting the old keys |
| `/invite/[token]` | Team invite | real | keep |

## Coming-soon inventory after this round

- Ads from a photo, Ads from a link: sidebar "Coming soon" (folded), `/new` list, Platform menu "Soon", two platform pages with a waitlist, one line in the API docs. Kept on purpose: real work behind a flag.
- Partner program: "Opens soon" with a waitlist, under Company.
- Gone from the user's view: Publish to TikTok, Publish to Reels, Publish to Shorts, Import from Shopify (sidebar, tool search, Settings → Connections). The Slack bot and Ad Launcher pages were already off the site (`docs/concepts/`).

## API and MCP, the facts

- **API**: `/api/v1/translations`, `/api/v1/ads` (403 while ads are off), `/api/v1/projects`, `/api/v1/projects/[id]`; keys per workspace from Pro (`/settings/api`), bearer auth, idempotency keys, outgoing webhooks for `project.completed` / `project.failed` with signatures. Documented on `/docs/api`, tested in `src/lib/api/v1.test.ts`. Real; stays in the Platform menu as "Developer API" and in Resources as "API docs".
- **MCP**: `mcp/` builds a stdio server with `create_ad`, `translate_video`, `get_project`, `list_projects` against the same API. It is not on npm and the docs say it is available on request. Real but not self-serve: pages stay, menus do not point at them, the API docs do.
