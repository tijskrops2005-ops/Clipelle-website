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
