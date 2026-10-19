# Reelay — AI video workflow app

> "Reelay" is a temporary product name. It lives in one config value (`src/lib/config.ts`) so it can be replaced later.
> The original brief is in `docs/master-prompt.md`. **Its service choice (Vmake → HeyGen → VEED) is superseded**: Stage 6 showed that Vmake and VEED have no usable API (see `docs/api-verification.md`). The current direction and plan are in `docs/roadmap.md`. Read both when a decision touches product scope.

## What this product is

A simple SaaS web app that runs Tijs's complete ad-production process **automatically**, using existing services that have a public API. The user enters a product once, clicks "Generate video", follows progress, and downloads a finished 9:16 ad.

The process the app automates:

1. **Input**: product photos + product information.
2. **Script**: hook and script per angle (problem/solution, UGC/testimonial, product demo), written automatically.
3. **Product clip**: B-roll generated from the product photo.
4. **Presenter**: an AI presenter speaks the script.
5. **Final edit**: hook (0–2 s), presenter, product footage, benefits, offer with CTA, captions, music → one 9:16 MP4.
6. **Result**: preview and download.

**This is NOT** a new AI video generator, an AI model, a marketing/analytics platform, a creative-strategy tool, or a video editor. Value = convenience, automation, time saved. The services behind each step are replaceable; the process is the product.

## The workflow and the services behind it

```
Input ─→ Script (Claude API) ─┬→ Product clip (fal.ai image-to-video) ──┐
                              │                                         ├→ Final edit (Shotstack; fallback Creatomate) → storage → preview + download
                              └→ Presenter (HeyGen v3) ─────────────────┘
```

- Product clip and presenter run in parallel. The final edit starts only when both are completed.
- The order is predefined by the app. No node editor, no user-configured connections.
- **Service per step** (from `docs/api-verification.md`, verified against official docs on 2026-10-18):
  - Script: Anthropic Claude API, model `claude-opus-5-5`, structured JSON output (hook, scenes, benefits, offer, CTA, presenter script).
  - Product clip: fal.ai image-to-video (model chosen in Stage 7), `aspect_ratio: "9:16"`, queue polling.
  - Presenter: HeyGen **v3 only** (`POST /v3/videos`, `aspect_ratio: "9:16"`, webhooks). v1/v2 are sunset on 2026-10-31; never use them.
  - Final edit: Shotstack Edit API (timeline, rich captions, text, audio, `callback`), chosen for the MVP and verified in the sandbox in Stage 7. HeyGen "studio" can concatenate scenes but has no text overlays, CTA, music or transitions, so it is not the final editor; a HeyGen template is at most an experiment after the MVP, not a planned replacement.
- Every provider returns temporary URLs. The orchestrator (Stage 8) copies each output to our own storage before the next step and before download.
- **UI step labels stay generic** ("Script", "Product clip", "AI presenter", "Final edit"). Service names appear only as the small mono label on a step card and in Settings, read from one place in code, so a provider can be swapped without touching screens.

## Current stage

Stages 1–6 are done: inspection, competitor analysis, design plan, frontend skeleton with mock data, frontend polish, and API verification (`docs/api-verification.md`). The roadmap with the MVP and extensions is in `docs/roadmap.md`. **Stage 7 is in progress**: all four service modules are built with their own dev test benches: HeyGen v3 (`/dev/heygen`), Claude script (`/dev/script`), fal.ai product clip with smart crop and Bria Expand (`/dev/product-clip`), Shotstack final edit (`/dev/final-edit`, verified in the free sandbox). Paid tests (HeyGen, Claude, fal.ai) still have to run once Tijs adds credits and keys. Next: Stage 8 (database, storage, background jobs, webhooks, orchestrator) after the paid tests pass.

Do not skip ahead. Build the MVP (one product → one complete 9:16 ad, one angle) before any extension.

Stage plan: 7 integrate each service separately → 8 automated workflow (database, storage, background jobs, webhooks, orchestrator, retry) → 9 end-to-end test with real products, Demo mode off → 10 deployment prep.

## Pages (first version — keep it this small)

1. **Dashboard** `/dashboard`: greeting, prominent "Create new video" button, recent projects as tiles.
2. **New video** `/new`: project name, product name, product URL, description, product images (upload), script (optional; when empty the Script step writes one). Main button: "Generate video". Add other fields (angle, presenter, music) only when the roadmap step that needs them is being built.
3. **Project page** `/projects/[id]`: one page for both progress and result. Shows the pipeline (each step: Waiting / Processing / Completed / Failed), plain-language error + Retry on failure, and when done: video player, Download, "Make another", back to dashboard.
4. **Projects** `/projects`: all projects, filterable by Processing / Completed / Failed.
5. **Settings** `/settings`: placeholder only for now.

Sidebar navigation: Dashboard, New video, Projects, Settings. "Create new video" is always the most prominent action.

## Design direction

References were MakeUGC (overall feel, numbered step cards) and Creatify (one-primary-input-first creation flow). Use their patterns, never their logos, colors, assets or exact visuals. Full analysis and the approved plan: `docs/design-analysis.md` (screenshots in `docs/references/`).

The app looks **premium, light and calm**, in the spirit of MakeUGC's light style:

- **Soft surfaces.** The sidebar sits on the page background with no border; only cards are white. Cards use `rounded-card` (20px) and the layered `shadow-card`; on hover `shadow-card-hover`. Inner panels inside cards use `surface-muted` with 14px radius.
- **Big, tight headings.** Page titles use the `text-display` utility (40px, -0.03em). Section titles are 24px. Subtitles 17px muted, body 15px, meta 13px.
- **Micro-labels in mono.** The `label-mono` utility (Geist Mono, 11px, uppercase) is used for service names, step labels and the Demo mode pill. Never for body text.
- **One accent pill.** `Button variant="accent"` is a fully rounded pill with `shadow-accent`, reserved for the main call to action on a page ("Create new video", "Generate video"). Every other primary button is black (ink), 12px radius.
- **Numbered step cards** (`StepCard`) are the signature element: ink circle with the number, generic title ("Product clip", "AI presenter", "Final edit"), mono service label from config, muted inner panel, plain-language description. On the dashboard they explain the flow with small original SVG illustrations; on the project page they show live status (accent = processing, green check = completed, red cross = failed).
- **9:16 video tiles** (`ProjectTile`) are the eye-catcher: floating white status badge top-left, play button bottom-right, dark gradient with name and duration on completed tiles, first product image as poster when available.
- **Generous spacing.** Content max-width 1120px, sections 64px apart, card padding 28px.
- Light theme only. No gradient text, no promo bars, no dark mode.
- Responsive down to phone width: sidebar from `lg`, a top bar with a drawer (`MobileNav`) below it; tile grids 2 → 3 → 4 columns.

Design tokens (defined once in `src/app/globals.css` as CSS variables and exposed via Tailwind `@theme`; never hard-code colors in components):

| Token | Value | Use |
|---|---|---|
| `ink` | `#111114` | text, primary buttons |
| `bg` | `#FAFAF7` | page background, sidebar |
| `surface` | `#FFFFFF` | cards |
| `surface-muted` | `#F4F3EF` | inner panels, placeholders |
| `border` | `#ECEAE4` | subtle card borders |
| `divider` | `#E7E5E0` | separators |
| `muted` | `#6B6B70` | secondary text |
| `accent` | `#D43F1B` | main CTA, active step (white text on it meets AA) |
| `accent-hover` | `#C03716` | |
| `success` | `#16A34A` | completed |
| `warning` | `#D97706` | waiting/attention, demo labels |
| `danger` | `#DC2626` | failed |

Radius: `radius-card` 20px, `radius-tile` 16px, `radius-control` 12px (buttons/inputs). Shadows: `shadow-card`, `shadow-card-hover`, `shadow-accent`. Font: Geist (sans) and Geist Mono via `next/font`.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Reusable UI components in `src/components/ui/` (Button, Card, Badge, Input, Textarea, Field, UploadDropzone, VideoPlayer, EmptyState, ErrorState, Skeleton, PageHeader/SectionHeader).
- Feature components in `src/components/` (AppShell, Sidebar, MobileNav, Brand, StepCard, StepIllustrations, ProjectTile, Poster, ProjectForm, ProjectView, ProjectsGrid, DemoModeBadge/DemoBadge, DemoRunner), dashboard sections in `src/components/dashboard/`, pipeline cards in `src/components/pipeline/`.
- Every page uses `PageHeader` for its title row and `SectionHeader` for sections; every simulated element carries `DemoBadge`. Each route has `loading.tsx`; `(app)/error.tsx` and `app/not-found.tsx` cover errors and unknown URLs inside the shell.
- Developer tools live under `src/app/(app)/dev/` (pages) and `src/app/api/dev/` (route handlers). They return 404 outside `NODE_ENV=development`, are never linked from navigation, and never touch the demo store or the pipeline. Current tool: `/dev/heygen` (Stage 7 step 1).
- **HeyGen work**: read `docs/vendors/heygen/capabilities.md` first (what the API can do, endpoints, costs, source links; the docs index is in `docs/vendors/heygen/llms.txt`). Then always fetch the current source page on developers.heygen.com before writing code: the documentation changes often, fields get renamed and v1/v2 disappear on 2026-10-31.
- **Vendor docs**: before touching a service, read `docs/vendors/<vendor>/capabilities.md` (anthropic, fal, heygen, shotstack) and fetch the live source page; the files are dated and APIs change.
- Real service clients live in `src/lib/services/` and start with `import "server-only"`. They read keys from `process.env` at call time and never include them in errors or logs. Only calls that cost money (e.g. HeyGen `POST /v3/videos`) require an explicit confirmation from the UI; listing and status calls are free.
- **Cost guard (`src/lib/services/costGuard.ts`)**: every paid call goes through `reserveSpend()` before the provider is called and `settleSpend()` afterwards. It enforces `MAX_COST_PER_ACTION_USD` (default 1.00) and `MAX_DAILY_SPEND_USD` (default 5.00) from `.env.local`, refuses an identical request within 10 minutes, and logs service, estimate, actual cost and time to `.reelay/cost-log.jsonl` (gitignored; Stage 8 moves it to the database). A refused call returns HTTP 409 with a plain-language message. New paid routes must use it; `/api/dev/cost` serves the spend meter shown on every test page.
- Later (Stage 8, not now): database for projects, file storage, and a background-job service for long-running video jobs (serverless functions time out).

Planned structure:

```
src/
  app/(app)/dashboard | new | projects | projects/[id] | settings
  components/ui/        reusable building blocks
  components/           feature components
  lib/config.ts         product name and app-wide constants
  lib/types.ts          Project, StepStatus, etc.
  lib/mock/             ALL mock data, the client-side demo store (localStorage) and the simulated workflow runner
  lib/services/         (Stage 7) script.ts (Claude), productClip.ts (fal.ai), heygen.ts (HeyGen v3 presenter), finalEdit.ts (Shotstack) — server-only, one file per step, provider swappable behind it
  lib/workflow/         (Stage 8) the orchestrator
```

Core data model (start here, extend only when needed):

- `Project`: id, name, productName, productUrl?, description, imageUrls[], script?, status (`draft | processing | completed | failed`), steps, finalVideoUrl?, createdAt.
- `steps`: keyed by generic step names (`productClip | presenter | finalEdit`; `script` joins when the orchestrator runs it as its own step), each with status (`waiting | processing | completed | failed`), startedAt?, finishedAt?, error?, outputUrl?, externalJobId?, attempt?. Keys describe the step, never the provider; the provider label per step comes from `config.services`.

## Non-negotiable rules

1. **API keys**: they live only in `.env.local`, read only in server-side code under `src/lib/services/` or `src/lib/workflow/`. Never in client components, never in code, never in commits, never in chat or in documents. Commit only `.env.example` with empty values. If a key ever appears in a message, a log or a file, treat it as leaked: tell Tijs to revoke it in the provider's dashboard and create a new one. Do not echo `.env.local` contents, even partially.
2. Mock data lives only in `src/lib/mock/` behind the same interface the real services will use later.
3. While mock data is used, the UI shows a visible **"Demo mode"** label. Never present a simulated run as a real completed video.
4. Prevent duplicate workflow starts (disable the button after submit, guard on the server later).
5. No features outside the scope above: no analytics, campaign management, ad launching, creative-strategy engines, node editors, model pickers or editing suites, unless Tijs explicitly asks.
6. Keep changes focused. Do not rewrite large parts of the project without a clear reason.
7. **Rights confirmation for uploaded videos (Workflow B, translation of an existing video)**: before any translation starts, the user must tick: "Ik heb de rechten op deze video en toestemming van de spreker voor het gebruik van zijn of haar stem en gezicht." No tick, no translation: the button stays disabled and the server rejects the request when the confirmation is missing. Store the confirmation with a timestamp on the project. Never build watermark removal.

## How to work with Tijs

Tijs is the founder, an e-commerce entrepreneur, and is learning as we build. Act as a technical collaborator and mentor.

- Communicate in Dutch unless he writes in English. Code, comments and file names stay in English.
- For every change: inspect the relevant files first → explain the intended change in plain language → make a focused change → check it works (run the dev server or build) → report what changed → explain how he can test it → name the next logical step.
- Explain technical terms briefly the first time they come up. Don't oversimplify the real implementation.
- When there are options, recommend one and say why. Don't hand him a long list of decisions.
- Ask at most one focused question at a time, and never ask what you can find out by reading the code or official docs.
- Always state clearly what is implemented, what is simulated, and what is waiting for API integration.
