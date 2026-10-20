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
5. **Final edit**: the presenter video is the base for the whole ad (picture and voice); the one product clip (and the prepared product photo) is laid over it at fixed moments with varied slow camera moves and 0.5 s fades/slides, captions over the whole video, optional logo top right, soft music → one 9:16 MP4. **FIXED RULE (2026-10-19): the only text on screen is the captions of what the presenter says, in the chosen caption style. No hook card, no benefit labels, no end card, no button, no other text overlay, ever, unless Tijs explicitly asks for it.** Hook, benefits and call to action are spoken lines. Lengths 10, 20, 30, 45 or 60 s (default 30), the only list is `AD_LENGTHS` in `src/lib/pricing.ts`; the on-screen plan per length is `adLayout()` in `src/lib/adLayout.ts`.
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
- **Provider names are never shown to customers.** Step titles and the mono micro-labels stay generic ("Product clip", "AI presenter", "AI translation", "Captions and 9:16"), read from `config.stepLabels`; explainer copy says what a step does, not who runs it; the sidebar footer shows the tagline. HeyGen, Shotstack, fal.ai and Claude appear only on the `/dev` test pages (and in `config.services`, which only those pages use).

## Current stage

Stages 1–6 are done: inspection, competitor analysis, design plan, frontend skeleton with mock data, frontend polish, and API verification (`docs/api-verification.md`). The roadmap with the MVP and extensions is in `docs/roadmap.md`. **Stage 7 (Workflow A) is built but not paid-tested**: all four service modules exist with their own dev test benches: HeyGen v3 (`/dev/heygen`), Claude script (`/dev/script`), fal.ai product clip (`/dev/product-clip`), Shotstack final edit (`/dev/final-edit`, verified in the free sandbox). The paid tests of Workflow A are postponed.

**Workflow B, "translate an existing video"** (see `docs/roadmap.md`, section "Workflow B"): three steps, Upload → Translate → Captions and 9:16, no manual review (removed 2026-10-20). Form on `/new/translate`: video upload (32 MB limit explained before upload), spoken language (Detect automatically preselected, searchable list), target languages (all 190 service languages and regional variants, searchable, most-used first, several at once, a target equal to the source is refused), Speed/Precision with plain-language descriptions from the service docs and a live estimate, terms to keep (brand glossary), format 9:16/original, remove silence at start and end (default on), caption position Low/Middle, enhancement, the mandatory rights checkbox. The Translate step requests one proofread per target language plus the source transcript, then runs the automatic quality check (`src/lib/services/translationCheck.ts`, Sonnet, cents through the cost guard): every line compared with the source for missing/added words, meaning, numbers, names and natural phrasing, corrected within the timing limit, changes and warnings stored on the translation (`qa`) and shown on the project page; the corrected SRT goes back to the service before the paid render. Language versions render in parallel. Real services behind `/dev/translate` (`src/lib/services/translate.ts`, `buildCaptionEdit` in `finalEdit.ts`); the first paid proofread/translation test waits for credit. **Stage 8 is in progress** (plan with the agreed choices: `docs/stage8-plan.md`). Step 1 done: Postgres on Supabase with Drizzle (`src/lib/db/schema.ts`, migrations in `./drizzle`, `npm run db:generate` / `db:migrate`, status page `/dev/db`). Budget per creative (after step 7): `MAX_COST_PER_CREATIVE_USD` replaces the daily limit; estimates in `src/lib/pricing.ts` are shown on both forms, checked server-side in `startProject`, and enforced during the run by the cost guard (Workflow B per language version: one version stops with a message on its result card, the others finish). Step 7 done: orchestrator for Workflow B (`src/lib/inngest/functions/translateWorkflow.ts`: upload to HeyGen → proofread sessions incl. a source transcript → automatic quality check (Sonnet) → per language, in parallel: checked SRT back to HeyGen, paid render, optional Topaz enhancement (`src/lib/services/enhance.ts`), Shotstack captions in 9:16 or the original size (`ingestFromUrl` probes dimensions), silence trimmed from the cue times → storage → completed). Verified free with the guard at $0: upload step completed for real (asset + dimensions), translate step refused with the guard's message, retry resumed at translate. Step 6 done: orchestrator for Workflow A (`src/lib/inngest/functions/adWorkflow.ts`: script → product clip ‖ presenter → final edit, polling, every result copied to storage, cost guard per step with project/step ids, plain-language failures, Retry resumes at the failed step; shared helpers in `src/lib/workflow/steps.ts`, defaults in `src/lib/workflow/settings.ts`). Verified free with the spending guard at $0: the run fails at the script step with the guard's message and a retry resumes there. Step 5 done: data layer with the demo switch (`src/lib/data/server.ts` for the database, `src/lib/data/client.ts` as the one interface every screen uses; routes under `/api/projects` and `/api/uploads/sign`; `NEXT_PUBLIC_DEMO_MODE=false` turns the database on, default stays demo). The ad workflow now has a visible `script` step. Workflow B form has the options review-before-rendering, format and enhance. Step 4 done: Inngest job system (`src/lib/inngest/client.ts` with typed events via `eventType` + zod, functions in `src/lib/inngest/functions/`, route `/api/inngest`, `npm run dev:jobs` for the local dev server on :8288, smoke test on `/dev/jobs` verified incl. a retried step). Step 3 done: cost guard on the `cost_entries` table (same API, plus `projectId`/`stepId`; self-test on `POST /api/dev/cost/selftest`). Step 2 done: own storage (`src/lib/storage.ts`, private bucket, signed direct uploads, `copyFromUrl`, usage meter on `/dev/storage` and Settings) and the database security check on `/dev/db` (RLS on all tables, no grants for anon/authenticated, live probes with the publishable key refused). Next steps in order: webhooks (step 8), retry polish, access code, deployment prep. Both workflows run end to end in database mode; paid tests still wait for HeyGen credit. Paid tests of both workflows still wait for HeyGen credit.

Do not skip ahead. Build the MVP (one product → one complete 9:16 ad, one angle) before any extension.

Stage plan: 7 integrate each service separately → 8 automated workflow (database, storage, background jobs, webhooks, orchestrator, retry) → 9 end-to-end test with real products, Demo mode off → 10 deployment prep.

## Pages (first version — keep it this small)

1. **Dashboard** `/dashboard`: greeting, prominent "Create new video" button, recent projects as tiles.
2. **New video** `/new`: chooser between Workflow A ("Make an ad from a product photo", `/new/ad`) and Workflow B ("Translate an existing video", `/new/translate`). The ad form in three steps: (1) product images (upload), product name, product URL; (2) presenter: quality cards Standard/Premium and the presenter picker; (3) details: project name, description, video length (10/20/30/45/60 s with the estimate per length; a combination above the budget shows a message and cannot start), script (optional; when empty the Script step writes one), main button "Generate video". The translate form: video upload with preview (32 MB limit explained before upload), source language (auto or pick), target languages (Slovak, German, French, Dutch, English), speed/precision with cost indication, the mandatory rights checkbox, main button "Start translation". Add other fields only when the roadmap step that needs them is being built.
3. **Project page** `/projects/[id]`: one page for both progress and result. Shows the pipeline (each step: Waiting / Processing / Completed / Failed, plus "Waiting for you" for the optional script review of Workflow A), plain-language error + Retry on failure, and when done: video player, Download, "Make another", back to dashboard. Workflow B shows the automatic quality check per language (corrected lines and warnings) and one result per target language; there is no manual review.
4. **Projects** `/projects`: all projects, filterable by Processing / Completed / Failed.
5. **Settings** `/settings`: placeholder only for now.

Sidebar navigation: Dashboard, New video, Projects, Settings. "Create new video" is always the most prominent action.

## Design direction

References were MakeUGC (overall feel, numbered step cards) and Creatify (one-primary-input-first creation flow). Use their patterns, never their logos, colors, assets or exact visuals. Full analysis and the approved plan: `docs/design-analysis.md` (screenshots in `docs/references/`).

The app looks **premium, light and calm**, in the spirit of MakeUGC's light style:

- **Soft surfaces.** The sidebar sits on the page background with no border; only cards are white. Cards use `rounded-card` (20px) and the layered `shadow-card`; on hover `shadow-card-hover`. Inner panels inside cards use `surface-muted` with 14px radius.
- **Big, tight headings.** Page titles use the `text-display` utility (40px, -0.03em). Section titles are 24px. Subtitles 17px muted, body 15px, meta 13px.
- **Micro-labels in mono.** The `label-mono` utility (Geist Mono, 11px, uppercase) is used for the generic step descriptors, step labels and the Demo mode pill. Never for body text, never for provider names.
- **One accent pill.** `Button variant="accent"` is a fully rounded pill with `shadow-accent`, reserved for the main call to action on a page ("Create new video", "Generate video"). Every other primary button is black (ink), 12px radius.
- **Numbered step cards** (`StepCard`) are the signature element: ink circle with the number, generic title ("Product clip", "AI presenter", "Final edit"), mono step descriptor from `config.stepLabels`, muted inner panel, plain-language description. On the dashboard they explain the flow with small original SVG illustrations; on the project page they show live status (accent = processing, green check = completed, red cross = failed).
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
- Developer tools live under `src/app/(app)/dev/` (pages) and `src/app/api/dev/` (route handlers). They return 404 outside `NODE_ENV=development`, are never linked from navigation, and never touch the demo store or the pipeline. Current tools: `/dev/heygen`, `/dev/script`, `/dev/product-clip`, `/dev/final-edit`, `/dev/translate` (Workflow B).
- **HeyGen work**: read `docs/vendors/heygen/capabilities.md` first (what the API can do, endpoints, costs, source links; the docs index is in `docs/vendors/heygen/llms.txt`). Then always fetch the current source page on developers.heygen.com before writing code: the documentation changes often, fields get renamed and v1/v2 disappear on 2026-10-31.
- **Vendor docs**: before touching a service, read `docs/vendors/<vendor>/capabilities.md` (anthropic, fal, heygen, shotstack) and fetch the live source page; the files are dated and APIs change.
- Real service clients live in `src/lib/services/` and start with `import "server-only"`. They read keys from `process.env` at call time and never include them in errors or logs. Only calls that cost money (e.g. HeyGen `POST /v3/videos`) require an explicit confirmation from the UI; listing and status calls are free.
- **Cost guard (`src/lib/services/costGuard.ts`)**: every paid call goes through `reserveSpend()` before the provider is called and `settleSpend()` afterwards. It enforces `MAX_COST_PER_ACTION_USD` (default 1.50, per call) and `MAX_COST_PER_CREATIVE_USD` (default 1.50: what one click may cost in total; Workflow A per project, Workflow B per language version with shared costs split evenly; failed attempts and retries count) from `.env.local`, refuses an identical request within 10 minutes, and records service, estimate, actual cost, time and (from the orchestrator) project and step in the `cost_entries` table. A refused call returns HTTP 409 with a plain-language message. New paid routes must use it; `/api/dev/cost` serves the spend meter shown on every test page, and `/dev/costs` is the full overview (per run, per call, totals, CSV export, fal.ai usage check). Every `settleSpend` passes a `basis` (balance, tokens, provider or list) and reservations carry `meta` with model/setting (engine, resolution, model label, seconds, mode) so the overview can describe each call.
- **Database (Stage 8)**: Postgres on Supabase, schema in `src/lib/db/schema.ts` (projects, steps, assets, translations, cost_entries, webhook_events), client in `src/lib/db/index.ts` (server-only, transaction pooler, `prepare: false`). Schema change = edit schema → `npm run db:generate` → `npm run db:migrate` → commit the files in `./drizzle`. Migrations use `DIRECT_DATABASE_URL` (session pooler). **Storage**: `src/lib/storage.ts` (Supabase Storage, private bucket `reelay`); the browser uploads with a signed URL (`src/lib/supabase/browser.ts`), the server signs and copies provider results with `copyFromUrl` before the next step; provider URLs are never stored. **Security**: RLS is enabled on every table and the Data API roles have no grants (migration 0002); new tables inherit that; `/dev/db` proves it live. The secret key is used only by `src/lib/supabase/server.ts`.
- **Data layer (Stage 8)**: screens never import the mock store or the database directly; they use `src/lib/data/client.ts` (`useProjects`, `useProject`, `createAdProject`, `createTranslateProject`, `saveReviewedSegments`, `approveReview`, `retryStep`, `rewriteInAdTone`). Demo mode (`config.demoMode`, from `NEXT_PUBLIC_DEMO_MODE`, default on) routes those to `src/lib/mock`; database mode routes them to `/api/projects/*`, which call `src/lib/data/server.ts`. Creation flow in database mode: draft → signed uploads straight to storage → attach assets → `/start` (idempotent) → Inngest event.
- **Background jobs (Stage 8)**: Inngest v4. Events are declared once in `src/lib/inngest/client.ts` with `eventType(name, { schema })` and sent with `inngest.send(someEvent.create({...}))`; functions use `triggers: [someEvent]`, `step.run` (retried per step), `step.sleep` and `step.waitForEvent`. Local: run `npm run dev` (sets `INNGEST_DEV=1`) and `npm run dev:jobs` side by side; the UI is on http://localhost:8288. Never call providers outside a `step.run`.
- **Script step rules** (`src/lib/services/script.ts`): the presenter talks the whole ad, so the presenter text has a hard word limit of ad length × 2.5 words per second (`maxSpokenWords`: 10 s = 25, 30 s = 75, 60 s = 150) that is stated in the prompt together with the scene plan from `adLayout()` (scenes describe what is on screen while the voice continues; their seconds add up to the length); after the call the count is checked: too long → one automatic shortening pass (a second paid call through the cost guard), still too long → cut locally to whole sentences, keeping the call to action, with a `warning` on the step. The spoken text runs hook → problem → product → benefits → call to action as the last sentence (10 s: hook, product, CTA only), and the spoken hook carries the same message as the on-screen hook. Both callers (the `/dev/script` route and the ad orchestrator) use `writeScriptWithinLimit` and wrap each paid call with reserve/settle.
- **Presenter quality is the one choice customers get** (explicit exception to rule 5, asked by Tijs): on `/new/ad` two cards, "Standard" (Avatar III) and "Premium" (Avatar IV, default), with a short description and the estimate for the whole video at the chosen length; the budget check and the "over budget" message apply to the combination of length and quality. Labels live in `PRESENTER_QUALITIES` (`src/lib/pricing.ts`); the engine is stored on the project (`AdInput.engine`) and used by the orchestrator. Engine and provider names stay on `/dev` pages and Settings.
- **Presenter picker** (`src/components/PresenterPicker.tsx`, data via `listPresenters` in the client data layer; demo mode shows placeholder presenters with a Demo badge, database mode reads `/api/presenters`, which serves the cached portrait catalogue from `src/lib/presenters.ts`): portrait looks that support the chosen quality (Premium = digital twins only), gender filter, 12 per page with "More presenters", the six curated looks first, the default look (`HEYGEN_DEFAULT_LOOK_ID`, Olivia) preselected. Nothing picked = default; a pick that the new quality does not support falls back to the default with a plain notice. The pick is stored as `AdInput.lookId`; the orchestrator verifies it (portrait, engine) and uses the look's `default_voice_id` unless `HEYGEN_DEFAULT_VOICE_ID` is set. Customers see names and photos only.
- **Language, accent, voice, speed** (`src/lib/voiceOptions.ts`, catalogue in `src/lib/voices.ts`, route `/api/voices`, `VoicePicker`): one language choice drives script, captions and voice; the list is built from the public voice list (8 languages with voices). HeyGen voices have no locale field, so accents come from voice names and are offered only when voices exist. The voice is filtered on language + accent + the presenter's gender and preselected on the presenter's own voice when it fits; previews play one at a time. Speed Slower/Normal/Faster = `voice_settings.speed` 0.9/1/1.1; the word limit stays at normal pace and the estimate uses seconds ÷ speed. `pickVoice()` checks before the paid call that the voice exists and speaks the language, with a plain message otherwise. `AD_LANGUAGE` is only the initial value; never filter voices on "English" by default.
- **Customer choices on /new/ad** (all stored on `AdInput`, used by the orchestrator, with defaults when missing; lists in `src/lib/adOptions.ts`): script language (default `AD_LANGUAGE`), Offer (max 80 chars; only then may the CTA mention a deal), Direction (max 200 chars), Tone (Elegant/Playful/Direct/Warm, default Direct); presenter background (own / colour / uploaded image, HeyGen `background` + `remove_background`, with a fallback to the look's own background on a 400); brand style (accent hex with a WCAG contrast warning under 3:1, caption look, Shotstack built-in font, logo upload; the accent now only colours the captions' active word); "Review script first" (script step waits in `needs_input`, approval via `POST /api/projects/[id]/script`, event `project/ad-script.approved`; retries resume with the approved text). The script returns three hooks; without a review the first is used. Free-text fields are data: the prompt marks them as such and never follows instructions inside them; the word limits per length stay hard. Not offered on purpose: clip model/duration/prompt, voice pitch/volume, expressiveness/motion prompt, photo avatars, music (no documented licence or price).
- **Presenter looks for the ad must be portrait.** HeyGen letterboxes a landscape look in 9:16 (picture 720×406 in a 720×1280 frame; `fit: cover` would give a blurry centre strip). `src/lib/lookOrientation.ts` reads `preferred_orientation`/`image_width`/`image_height`; `pickPresenter` refuses a landscape `HEYGEN_DEFAULT_LOOK_ID` with a plain message and otherwise picks the first portrait look for the engine; `/dev/heygen` marks orientation and filters "Portrait only" by default. Portrait looks on both engines are digital twins only (counted 2026-10-19).
- **Product clip prompt** (`src/lib/clipPrompt.ts`): one pure function builds the motion prompt for the clip models from the product name, the script's `mood` and the script's `photoShowsPerson` (Claude answers that while it looks at the photo in the script step); with a person the prompt keeps person, face and outfit unchanged, without one it keeps the product unchanged on a clean background. The orchestrator sends exactly this text and `/dev/product-clip` shows it as the grey default (typing overwrites it).
- **Orchestrators (Stage 8)**: one Inngest function per workflow in `src/lib/inngest/functions/`. Each pipeline step: skip if the database says completed → `markProcessing` → provider call inside `withRetries` (transient errors only) → copy results with `storeFromUrl`/`storeBytes` → `markCompleted`; any final error goes through `failStep` (plain message, project failed, run stops). Paid calls reserve/settle on the cost guard with `projectId` and `stepId`. Defaults (look, voice, engine, 1080p, clip model with a date-based default, rewrite model, ad length) come from `src/lib/workflow/settings.ts` / `.env.local`; the reasoning behind each choice is in `docs/cost-quality.md`.
- **Forms that start paid work** keep their submit button disabled ("Loading…") until React is attached (`useHydrated`): a click on the static HTML would submit natively and reload the page with nothing saved. Both forms show `ServiceStatusBanner` (reads `/api/health`) when the database or the job system is unreachable, and `startProject` reverts a project to draft with a 503 and a plain message when the Inngest event cannot be sent.
- **Nothing may hang forever** (2026-10-19, after the server stalled for minutes): the database pool is small but not single (`max: 4`, `idle_timeout` 20 s, `max_lifetime` 10 min, `connect_timeout` 10 s in `src/lib/db/index.ts`), so one stuck connection never blocks every request; `/api/health` caches its result for 30 s and gives each check 3 s; every provider/storage fetch has an `AbortSignal.timeout`; every heavy job step runs inside `withDeadline(label, minutes, fn)` from `src/lib/workflow/steps.ts` so a stuck step ends on "Failed" with a plain message instead of "Processing" forever. New fetches and steps follow the same pattern.
- **Before every push to GitHub**: check that `.env*` (except `.env.example`), `.reelay/`, logs and anything that looks like a key are not in the commits or the working tree (`git ls-files`, `git diff --cached`); a `check:secrets` script and pre-push hook arrive in Stage 8 step 11, but the rule applies now.

Planned structure:

```
src/
  app/(app)/dashboard | new | projects | projects/[id] | settings
  components/ui/        reusable building blocks
  components/           feature components
  lib/config.ts         product name and app-wide constants
  lib/types.ts          Project, StepStatus, etc.
  lib/mock/             ALL mock data, the client-side demo store (localStorage) and the simulated workflow runner
  lib/services/         (Stage 7) script.ts (Claude), productClip.ts (fal.ai), heygen.ts (HeyGen v3 presenter + shared transport), finalEdit.ts (Shotstack: ad edit + caption edit), translate.ts (HeyGen video translation + proofread), adTone.ts (Claude rewrite), costGuard.ts — server-only, one file per step, provider swappable behind it
  lib/workflow/         (Stage 8) the orchestrator
```

Core data model (start here, extend only when needed):

- `Project`: id, name, productName, productUrl?, description, imageUrls[], script?, status (`draft | processing | completed | failed`), steps, finalVideoUrl?, createdAt.
- `steps`: keyed by generic step names (`productClip | presenter | finalEdit`; `script` joins when the orchestrator runs it as its own step), each with status (`waiting | processing | completed | failed`), startedAt?, finishedAt?, error?, outputUrl?, externalJobId?, attempt?. Keys describe the step, never the provider; the customer-facing label per step comes from `config.stepLabels`.

## Non-negotiable rules

1. **API keys**: they live only in `.env.local`, read only in server-side code under `src/lib/services/` or `src/lib/workflow/`. Never in client components, never in code, never in commits, never in chat or in documents. Commit only `.env.example` with empty values. If a key ever appears in a message, a log or a file, treat it as leaked: tell Tijs to revoke it in the provider's dashboard and create a new one. Do not echo `.env.local` contents, even partially.
2. Mock data lives only in `src/lib/mock/` behind the same interface as the database (`src/lib/data/client.ts`).
3. While mock data is used, the UI shows a visible **"Demo mode"** label. Never present a simulated run as a real completed video.
4. Prevent duplicate workflow starts (disable the button after submit, guard on the server later).
5. No features outside the scope above: no analytics, campaign management, ad launching, creative-strategy engines, node editors, model pickers or editing suites, unless Tijs explicitly asks.
6. Keep changes focused. Do not rewrite large parts of the project without a clear reason.
7. **Rights confirmation for uploaded videos (Workflow B, translation of an existing video)**: before any translation starts, the user must tick: "I own the rights to this video and have the speaker's permission to use their voice and face." (the app is fully English; the text lives once in `config.rightsConfirmationText`). No tick, no translation: the button stays disabled and the server rejects the request when the confirmation is missing. Store the confirmation with a timestamp on the project. Never build watermark removal.

## How to work with Tijs

Tijs is the founder, an e-commerce entrepreneur, and is learning as we build. Act as a technical collaborator and mentor.

- Communicate in Dutch unless he writes in English. Code, comments and file names stay in English.
- For every change: inspect the relevant files first → explain the intended change in plain language → make a focused change → check it works (run the dev server or build) → report what changed → explain how he can test it → name the next logical step.
- Explain technical terms briefly the first time they come up. Don't oversimplify the real implementation.
- When there are options, recommend one and say why. Don't hand him a long list of decisions.
- Ask at most one focused question at a time, and never ask what you can find out by reading the code or official docs.
- Always state clearly what is implemented, what is simulated, and what is waiting for API integration.
