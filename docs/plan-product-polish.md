# Plan: product polish (31 Oct 2026)

Phase 1 of the "make Clipelle noticeably better" assignment. Research and plan only; nothing built, nothing committed. Phase 2 starts on Tijs's "Akkoord".

## 1. Where we stand (from the docs and the last 40 commits)

- Translation is the product: upload → check every line → voice and lips per language → captions and 9:16, one progress card, parallel runs, quality reports for admins, measurement on the live site. Ads and URL to video sit behind `NEXT_PUBLIC_ADS_ENABLED` (off).
- `docs/build-progress.md` does not exist yet; Phase 2 creates it.
- Open from earlier docs (not part of this plan): go-live checklist items (production keys, Resend domain, Stripe live, real signup/translation checks), trial reminder mail (deliberately not built), API webhooks for customers, layout steps 7–8 of `layout-research.md`.
- Problems that came back more than once: hanging requests (fixed with pools, deadlines), provider limits (429, moderation holds), caption bugs over removed text, mobile jank (fixed on 28 Oct), pages that were too text-heavy (ticker, three price tables, "190 languages" six times, test content on /trust) and were removed at Tijs's request.

## 2. Competitors (public pages only; screenshots in `docs/research/screens/`)

| Site | What they do better than a plain form → wait → result | Files |
|---|---|---|
| captions.ai | The hero *is* the empty form: drop zone, language, one disabled button; translate page has three controls and a Translate/Dub toggle; editorial serif headline, no "AI" glitter. | `captions-home-hero`, `captions-translate-flow`, `captions-pricing` |
| synthesia.io | Numbered two-step form (1 upload, 2 translate to), everything else under "More translation options"; free transcript review before the paid step; a persistent "in progress / done / failed" panel; start another while you wait. | `synthesia-video-translator-form`, `synthesia-ai-dubbing-form`, `synthesia-pricing` |
| makeugc.ai | Waiting state as a tile grid: "7 / 10 ready", green check vs blurred poster + "Generating"; the price is on the button before the wait. | `makeugc-batch-mode-flow`, `makeugc-home-three-steps`, `makeugc-content-library-flow` |
| creatify.ai | One input is the whole form, "Try sample link" kills the empty state; working state as a step log ("Worked for 14 s"); several hooks as variants. | `creatify-url-to-video-steps`, `creatify-scriptwriter`, `creatify-ad-agent` |
| arcads.ai | Home is the product (one 9:16 video + a tool rail); product detected automatically, no cropping; preview the audio before the full render. | `arcads-home-hero`, `arcads-feature-ai-actors`, `arcads-help-platform` |
| creatomate.com | Named render lifecycle with warnings in the accept response; one accent word per heading, mono eyebrow, pastel tint per product. | `creatomate-template-editor`, `creatomate-shareable-forms`, `creatomate-bulk-generation` |

Patterns worth borrowing (patterns, never their copy or assets): form = hero with few visible controls and the rest folded; defaults preselected; price on the button (we have it); per-item status tiles while waiting; a free preview before the paid step; sample input against the empty state; distinctiveness through type, not gradients. Dropped: getvidforge (now a YouTube toolkit), icon.com (human UGC agency), hypernatural (no public product UI).

## 3. Audit of our own app (31 Oct 2026)

Demo mode locally (laptop 1440 px and 390 px), database mode on www.clipelle.com (public pages; the local database was deleted, so signed-in database screens could not be audited locally). "Before" screenshots: `docs/research/screens/clipelle-polish-before-*.jpg`.

Measured (dev server, so load times are indicative only):

| Screen | Words in `<main>` | Controls | Height laptop / phone |
|---|---|---|---|
| Dashboard | 244 | 37 | 2,042 / **4,037 px** |
| /new | 181 | 28 | 949 / 1,728 |
| /new/translate | **429** | **83 (50 buttons)** | 3,179 / **4,941 px** |
| Project while processing | 121 | 32 | 951 / 1,408 |
| Settings → Billing | 371 | 69 | 2,420 / 3,743 |
| Homepage (live) | 1,662 | 34 | 9,157 / **15,539 px** |
| Pricing (live) | 770 | 50 | 5,918 / 10,804 |

Clicks to a result on /new/translate: drop video → pick language → tick rights → Start = 4 actions, then the project page opens at once. That part is good.

Found:

1. **Dashboard renders a clock on the server** (`NowCreating.tsx:86`, `running(now - g.since)`): server and client disagree, React reports a hydration mismatch and re-renders the tree on every visit with a running video. In the dev server this even becomes a reload loop (Next restarts the page after the mismatch; the demo dashboard reloaded 8,000 times in ten minutes). Same risk in `ActivityFeed` and `TranslateProgress` wherever "ago"/"left" is rendered on the server.
2. **Demo mode never shows project tiles**: `/projects` and "Recent projects" stay skeletons after 9 s (`useProjectsReady` never flips; filters do show counts). Demo is the default for a fresh checkout and for screenshots.
3. **Live /pricing throws React #419** (the server could not finish a Suspense boundary, `PricingTable` switched to client rendering): the page is slower and the plan cards appear late.
4. **Translate form is the heaviest screen**: 50 buttons; the caption-style block alone has four colour rows, size, position and capitals; "Who speaks the translation?", Quality and Format are three card pairs; the optional project name sits in block 1 above the fold. Competitors show three controls and fold the rest.
5. **Dashboard on a phone is ten screens long**: credits strip, three stat cards, Now creating, Quick actions, Recent projects, Plan card, Activity, Tip, How it works. "Everything runs on its own" is said on the dashboard, on /new and on the form header. "How it works" repeats the form header's pipeline.
6. **Waiting state**: the demo project shows "76 % · 307 h 31 min" and "Taking a little longer than usual" (stale seed data, but the format allows hours). The two language chips show the same percentage twice (DE 69 %, FR 69 %) instead of what differs between them.
7. **Posters**: processing and demo tiles use an orange gradient placeholder; it reads as generic and dates the screens.
8. **Billing on a phone**: Add credits, Auto-reload and Plans in one scroll of 3,700 px.
9. **Homepage on a phone**: 15,500 px, about 18 screens. Blocks are Tijs's list, so only with his go.
10. Nothing overflowed sideways at 390 px; no console errors in the app besides the hydration one; the ⌘K search, mobile action bar and drawers work.

## 4. The ten improvements (sorted by impact for the customer)

| # | What | Why (evidence) | What the customer notices | Effort | Risk | Touches functionality |
|---|---|---|---|---|---|---|
| 1 | **Translate form: three visible choices, the rest folded.** Block 2 keeps languages and Speed/Precision; "Who speaks" becomes a two-chip segmented control; block 3 (format, captions, sound) collapses to one summary line "9:16 · captions on, box style · sound as is" with "Change"; the caption-style picker opens as one row with the preview. Project name moves under the fold and is prefilled from the file name. | Audit 4; Captions/Synthesia fold everything but the essentials. | A form that fits on one laptop screen; phone 4,941 → ~2,500 px. | M | Low: defaults unchanged, so `forms.test.ts` must stay green. | No |
| 2 | **Fix the server-rendered clock and the demo tiles.** Time-dependent text renders after mount (`useSyncExternalStore` mounted flag) in `NowCreating`, `ActivityFeed`, `TranslateProgress`; `useProjectsReady` flips in demo mode. | Audit 1 and 2. | No flash or re-render on the dashboard; demo screens show projects. | S | Low | No |
| 3 | **Dashboard with one job.** Greeting + one credit line; Now creating; Recent projects; one row of two actions. "How it works" only when there are no projects yet; Activity and Tip off the dashboard (listed in `docs/removed-blocks.md`, code kept). The three stat cards fold into the credit line. | Audit 5; MakeUGC/Arcads: the product first, explanation only once. | Phone dashboard 4,000 → ~1,600 px; the running video is the first thing you see. | M | Low | No |
| 4 | **Waiting state that is honest and specific.** Elapsed time as "Running 3 min", remaining as "about 2 min", never hours; per-language chip shows its phase word ("voice", "captions", "ready") instead of a duplicate percentage; when a language finishes, the chip pops and its poster becomes the first frame. | Audit 6; MakeUGC's per-tile status. | The five-minute wait reads as progress, not as a stuck page. | S | Low | No |
| 5 | **Pricing: find and fix the server error.** Read the Vercel log for #419, cache the Stripe-dependent part (`"use cache"` with a fallback) so the table renders on the server. | Audit 3. | Pricing shows at once, no late layout shift. | S | Medium: needs the live log to confirm the cause. | No |
| 6 | **"Add a language" on a finished translation.** Button on the result that opens `/new/translate?from=<id>` with the stored source (same mechanism as "Localize this ad": `copyObject`, `parentId`); the form skips the upload. | Synthesia keeps versions in one folder; today a second language means re-uploading. | One click to add French to the German you already made. | M | Medium: a new draft path, credits reserved as usual. | Yes (new entry point, existing start path) |
| 7 | **Posters without the gradient.** Processing and demo tiles show an ink tile with the language codes in gold; once the source is stored, its first frame (already the rule in database mode). | Audit 7; brand block below. | Tiles look like ours, not like a stock loader. | S | Low | No |
| 8 | **Remember my last choices.** Target languages, Speed/Precision, caption style and format are stored per workspace in the profile after a start and prefilled next time; a tiny "Last time: DE, FR" chip resets them. | Synthesia/Captions prefill; a returning customer repeats the same setup. | Second translation: drop the video, tick, start. | S | Low: the draft sent is whatever the form shows; snapshot unchanged. | Yes (stored next to the brand defaults in `profiles.brand`-style jsonb; that needs a migration, so localStorage per browser first, the profile column later) |
| 9 | **Billing in sections.** Plan · Add credits · Auto-reload · Plans as a segmented control on phones, cards side by side on laptops. | Audit 8. | Billing fits one phone screen per task. | S | Low | No |
| 10 | **Shorter homepage on phones.** FAQ and calculator as accordions on < `md`, hero copy to two lines, the "why" block one tab visible at a time (it already swipes). | Audit 9. | Homepage 15,500 → ~9,000 px on a phone. | M | **Needs Tijs's list**: no homepage block leaves without it. | No |

## 5. Merkgevoel (brand feel): own, not generic AI

Concrete, within the existing tokens (no purple gradients, no sparkle icons, no glass, no "AI magic" imagery):

- **Type.** Geist stays; one signature: every number that moves (credits, percentage, minutes, counts) is set in Geist Mono with tabular figures, like an instrument panel. Headings keep the tight -0.03em; no accent word, no gradient text.
- **Colour.** Red only on the one action per page (it is already the rule, but the "Retry", "Download" and "Start" buttons compete on some screens: one red per screen). Gold only on ink (posters, plan chip, the finished-language mark on a dark tile). Success green only for "ready", never for decoration.
- **Icons.** Lucide at 1.75 stroke and 18–20 px everywhere (now mixed 16–22); the ads icon "Sparkles" (the universal AI tell) becomes the image icon; "soon" items at 60 % opacity without the SOON pill on every row (one group label is enough).
- **Motion.** One orchestrated moment per page: on the project page the moment a language finishes (chip pops, poster swaps, a 0.5 s gold sweep over the tile). Remove the hover-lift on every card and the ping dot on "Now creating". Everything stays off under reduce-motion.
- **Microcopy.** Say the outcome, drop the hedges: "German version ready" instead of "Your video is being made · taking a little longer"; "Translate another while you wait" stays; "Everything runs on its own after you click start" appears once (on /new), not three times; "Only you see this" and "The frame, the captions and the sound" go.
- **Illustrations.** The /new cards' phone sketches grow to the card width with real caption words from the showcase; the "Illustration" label stays on the site only, not in the app.
- **Empty states.** No grey skeleton rows for a new account: one ink tile with "Your first video lands here" and the three steps.

## 6. Automatisering (where the app takes work off the customer's hands)

- Project name from the file name (`founder-story.mp4` → "Founder story"); never asked up front.
- Last choices remembered per workspace (#8).
- "Add a language" from a finished translation without a new upload (#6).
- Draft autosave of the form in localStorage (languages, options, not the file) so a refresh or a phone lock loses nothing. S, no server change.
- Automatic retry is already in place for transient errors and provider queues (`withRetries`, `untilFree`); make it visible: "Waiting for a free slot (2 min)" as the phase word instead of silence.
- The automatic quality check already runs; show its one-line verdict on the ready card ("Every line checked · 2 corrections") instead of only under Project details.
- Not automated on purpose: no auto-start after upload (credits are spent on the click), no automatic language guess for targets.

## 7. Niet doen (deliberately skipped)

- No new providers, models or a voice picker (not possible with the translation service).
- No editing suite, timeline or caption editor; captions follow the checked lines.
- No change to prices, credits, estimates, the cost guard, or what providers receive.
- No ad work: the flag stays off; existing ad pages keep working.
- No dark mode, gradients, glassmorphism, confetti or "AI" imagery.
- No homepage blocks removed without Tijs's list (#10 waits for it).
- No database migration unless #8 needs a column; then localStorage first.
- No signed-in database-mode audit on the live site with a test account (would create production data); Tijs can re-create a local database for Phase 2 screenshots or accept demo-mode screenshots.

## 8. Does it fit in about an hour?

No. The ten items are roughly 5–6 hours with tests and screenshots. In the first hour, in this order: #2 (clock and demo tiles), #4 (waiting state), #7 (posters), #1 (form fold, the biggest visible win), then #5 if the live log shows the cause. #3, #6, #8, #9 follow; #10 only with the list.

Phase 2 rules (from the assignment): tag `pre-product-polish` first, `docs/build-progress.md` kept up to date, one commit per improvement, tsc + lint + `npm test` + `check:secrets` + `npm run build` per change, screenshots `docs/research/screens/clipelle-polish-after-*.jpg` next to the `-before-` ones, no dev server left running by me.

## 9. Side findings (not in scope, for Tijs)

- The dev-server reload loop (audit 1) also explains the "Turbopack stale CSS" note in CLAUDE.md: a restart loop keeps old chunks in use. #2 removes the cause.
- Another project on this machine (BennAI on :3002) serves a settings object with an API key inside its page HTML; that key should be revoked and the page fixed. Nothing of Clipelle is affected.
- `src/proxy.ts` has an uncommitted change (`.well-known/` excluded from the matcher) plus an untracked `public/.well-known/` folder from the Google verification; commit or drop them before Phase 2 starts.
