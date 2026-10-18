# Reelay — AI video workflow app

> "Reelay" is a temporary product name. It lives in one config value (`src/lib/config.ts`) so it can be replaced later.
> The full original brief is in `docs/master-prompt.md`. Read it when a decision touches product scope or the stage plan.

## What this product is

A simple SaaS web app that **orchestrates** three existing video services through their APIs so the user never has to switch between them:

- **Vmake**: product footage. Product photo in → product/lifestyle/UGC-style video out.
- **HeyGen**: AI presenter. Script in → realistic talking person (voice, lip-sync, optional translation) out.
- **VEED**: final edit. Combines the clips, adds captions, hooks, music, CTA, 9:16 format → final ad out.

The user enters product info once, clicks "Generate video", follows progress, and downloads the finished video.

**This is NOT** a new AI video generator, an AI model, a replacement for these services, a marketing/analytics platform, a creative-strategy tool, or a video editor. Value = convenience, automation, time saved.

## The workflow

Vmake and HeyGen do not depend on each other. Both feed VEED:

```
          ┌→ Vmake  (product video) ──┐
Input ────┤                           ├→ VEED (final video) → preview + download
          └→ HeyGen (AI presenter) ───┘
```

- Vmake and HeyGen may run in parallel. VEED starts only when both are completed.
- The order is predefined by the app. No node editor, no user-configured connections.
- **None of the three APIs has been verified yet.** Do not assume a feature on a service's website exists in its API. VEED in particular may not expose editor features (timeline assembly, captions, music) via API. Verification happens in Stage 6.

## Current stage

Stages 1–5 are done: inspection, competitor analysis, design plan, the frontend skeleton with mock data (all five pages, simulated workflow runner, demo store) and frontend polish (responsive layout with a mobile drawer, loading/error/not-found states, consistent headers and demo labels, keyboard focus and contrast). **Next is Stage 6: API verification** against the official Vmake, HeyGen and VEED docs. Do not start it until Tijs says so.

Do not skip ahead. Do not start real API integrations until Tijs explicitly moves to Stage 6/7.

Stage plan: 4 frontend skeleton → 5 frontend polish (loading/empty/error states, responsive) → 6 API verification (official docs) → 7 integrate each API separately (Vmake, then HeyGen, then VEED) → 8 automated workflow → 9 end-to-end test → 10 deployment prep.

## Pages (first version — keep it this small)

1. **Dashboard** `/dashboard`: greeting, prominent "Create new video" button, recent projects as tiles.
2. **New video** `/new`: project name, product name, product URL, description, product images (upload), script (optional). Main button: "Generate video". Add other fields only when a verified API needs them.
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
- **Numbered step cards** (`StepCard`) are the signature element: ink circle with the number, title, mono service label, muted inner panel, plain-language description. On the dashboard they explain the flow with small original SVG illustrations; on the project page they show live status (accent = processing, green check = completed, red cross = failed).
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
  lib/services/         (Stage 7) vmake.ts, heygen.ts, veed.ts — server-only
  lib/workflow/         (Stage 8) the orchestrator
```

Core data model (start here, extend only when needed):

- `Project`: id, name, productName, productUrl?, description, imageUrls[], script?, status (`draft | processing | completed | failed`), steps, finalVideoUrl?, createdAt.
- `steps`: `vmake`, `heygen`, `veed`, each with status (`waiting | processing | completed | failed`), startedAt?, finishedAt?, error?, outputUrl?, externalJobId?.

## Non-negotiable rules

1. API keys stay server-side. Never in frontend code, never committed. Use `.env.local`; commit only `.env.example` with empty values.
2. Mock data lives only in `src/lib/mock/` behind the same interface the real services will use later.
3. While mock data is used, the UI shows a visible **"Demo mode"** label. Never present a simulated run as a real completed video.
4. Prevent duplicate workflow starts (disable the button after submit, guard on the server later).
5. No features outside the scope above: no analytics, campaign management, ad launching, creative-strategy engines, node editors, model pickers or editing suites, unless Tijs explicitly asks.
6. Keep changes focused. Do not rewrite large parts of the project without a clear reason.

## How to work with Tijs

Tijs is the founder, an e-commerce entrepreneur, and is learning as we build. Act as a technical collaborator and mentor.

- Communicate in Dutch unless he writes in English. Code, comments and file names stay in English.
- For every change: inspect the relevant files first → explain the intended change in plain language → make a focused change → check it works (run the dev server or build) → report what changed → explain how he can test it → name the next logical step.
- Explain technical terms briefly the first time they come up. Don't oversimplify the real implementation.
- When there are options, recommend one and say why. Don't hand him a long list of decisions.
- Ask at most one focused question at a time, and never ask what you can find out by reading the code or official docs.
- Always state clearly what is implemented, what is simulated, and what is waiting for API integration.
