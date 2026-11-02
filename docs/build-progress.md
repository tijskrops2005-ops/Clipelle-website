# Build progress: product polish (started 31 Oct 2026)

Plan: `docs/plan-product-polish.md`. Tag before the work: `pre-product-polish`. One commit per improvement; every commit passed tsc, lint, `npm test` (database tests skip: the local database is gone), `check:secrets` and `next build` in database mode. "Before" screenshots: `docs/research/screens/clipelle-polish-before-*.jpg`; "after": `clipelle-polish-after-*.jpg`.

How to continue after an interruption: read the table, take the first open row, build it, run `checks` (tsc, lint, test, secrets, build), screenshot the screens it touches, commit, tick the row.

| # | Improvement | Status | Commit |
|---|---|---|---|
| 2 | Clock after hydration (`useClock`, `dataClock`), stable ready hook | done | see git log |
| 4 | Waiting state: "Running N min", phase word per language chip, chip pops when ready | done | see git log |
| 7 | Posters without the gradient: ink tile, language codes in gold | done | see git log |
| 1 | Translate form: three visible choices, block 3 folded, name from the file | done | see git log |
| 3 | Dashboard with one job | done | see git log |
| 5 | Pricing server error (#419) | done | see git log |
| 9 | Billing in sections | done | see git log |
| 8 | Remember last choices (localStorage per browser) | done | see git log |
| 6 | Add a language on a finished translation | done | see git log |
| 10 | Shorter homepage on phones | waits for Tijs's list | |

Findings on the way:
- The "demo tiles never render" finding of the audit was a stale Turbopack cache (`.next/dev` built with the other `NEXT_PUBLIC_DEMO_MODE`): the client bundle polled `/api/projects` while the server rendered demo seeds. `rm -rf .next` fixed it. The hydration fix (#2) stays: the server-rendered clock really did differ from the browser's.

# Admin customers (started 2 Nov 2026)

Assignment: the full customer administration (/admin/customers, detail, view as customer, payouts, audit log), two-step verification (optional for everyone, required for administrators), and in the user settings an Admin card and a Danger zone (data export, scheduled account deletion). Tag before the work: `pre-admin-customers`. One commit per part; tsc, lint, `npm test`, `check:secrets` and `next build` pass after each. The local database is gone, so database-backed tests skip and the pages are checked in demo mode (mock data) plus unit tests on the pure rules.

| # | Part | Status | Notes |
|---|---|---|---|
| 0 | Schema: admin_audit_log, purchases, admin_views; profiles (totp, recovery codes, terms, referral, last seen, deletion); workspaces.limits; migration 0026 | done | `npm run db:migrate:prod` before the push |
| 1 | Two-step verification (TOTP, recovery codes) + admin gate (MFA required) + proxy (verify redirect, read-only view, referral cookie) | done | Supabase: enable MFA/TOTP in Auth settings |
| 2 | Audit log table + /admin/audit | done | see git log |
| 3 | /admin/customers | done | see git log |
| 4 | /admin/customers/[id]: stats, adjust credits, limits, workspaces, purchases, credit history, projects; purchases from the Stripe webhook; terms version | done | see git log |
| 5 | View as customer | done | see git log |
| 6 | /admin/payouts + referral at sign-up | done | see git log |
| 7 | Settings: Admin card, Danger zone (export, scheduled deletion, restore banner, final deletion job), top bar, app footer, privacy texts | done | see git log |
| 8 | Docs, screenshots (`clipelle-admin-*.jpg`), report | done | |

# Cost, speed, subtitles, edit screen (started 2 Nov 2026)

Master assignment: cheaper (docs/cost-reduction.md + safe savings behind env flags), faster (docs/speed.md + measured ETA), subtitles that fit the original text, UX fixes (profile → dashboard, no Home link, forms survive a refresh), a short edit screen with Export as a new version. Tag before: `pre-cost-speed-edit`. No paid provider calls while building; database tests skip (no local database); production is read for cost and timing aggregates only.

| # | Part | Status |
|---|---|---|
| 1 | Cost: research document + prompt caching, intermediate cleanup, quality-report sampling behind flags | done |
| 2 | Speed: measurements, polling/backoff, measured ETA | done |
| 3 | Subtitles over removed text: box follows the text's size and place, always covers the smudge; tests with local frames | done |
| 4 | UX: profile click → dashboard, menu for settings/logout, no Home link, form drafts with staged uploads | done |
| 5 | Edit screen: trim, cut, subtitles, lower third/logo, preview, Export as a version with credits | done |
| 6 | Screenshots, docs, report | done |
