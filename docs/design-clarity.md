# Clear, premium, not "AI-looking" (23 Nov 2026, Tijs)

Tijs's words: "net iets te veel tekst, te onduidelijk, te AI-achtig. Maak er een echte app van: duidelijk, clean, strak." This is the rule set for the whole site and app from now on. It sits on top of the design system in CLAUDE.md; where the two differ, this file wins.

## What reads as generated, and what we do instead

| Tell | Rule |
|---|---|
| A tracked-out mono label above every heading ("PRICING", "HOW IT WORKS") | No eyebrow labels above headings, anywhere. Mono (`label-mono`) only for data: language codes, durations, timestamps, keyboard keys. `SectionIntro`, `SectionCard` and `StepCard` ignore their eyebrow props since 23 Nov 2026. |
| Every heading followed by a sentence that explains the heading | A heading stands alone when it is clear. At most one short sentence under it, and only when it adds a fact. No page description that repeats the title ("Projects: every video you have started"). |
| Help text under every field, repeating the label | A field has a label and, where useful, an example as placeholder. Help text only for a real rule the person cannot guess (a limit, a cost, a consequence). Never "One or more." under "Translate into". |
| Buttons with an arrow glued on, and three buttons that mean the same thing | A button is a verb, no trailing arrow icon. One accent button per page; secondary actions are quiet. Not "Translate your first video free" and "Start for free" and "Translate a video" on one page: pick one label per action. |
| Cards everywhere: identical rounded white boxes, each with an icon in a tinted circle, a title and two sentences | A card holds one job. No icon circles for decoration, no card inside a card, no three-card row to say three adjectives. Facts go in a plain list or a table. |
| Meta strings joined with middle dots ("11 s · English to Dutch · own voice, lip sync, captions") | At most one "·" per line. Prefer a short line; details belong on the detail page. |
| Numbered circles on things that are not steps ("01 —— Apply") | Numbers only on a sequence the person follows (the three blocks of the form, the four steps of a run). Then a small plain number, no dash line, no two-digit padding. |
| Reveal animations on every section, glows, floating badges, pulse rings | No scroll-driven entrances (`Reveal` is static since 23 Nov 2026). Motion only in the product demos, the video pairs and in answer to a click. No glow fields on content pages. |
| Badges as labels ("Demo", "Stored in this browser", "Demo numbers", "Beta") | Badges only for state: Completed, Processing, Failed, Soon. A note is a quiet line of text, once per page, not a pill on every card. |
| Marketing voice: "Clear price. Nothing to reshoot.", "Built for brands that sell online", "What we promise" | Plain statements. Say what it does and what it costs. Cut adjective lists, cut sections whose only content is reassurance. One closing band per page is enough. |
| Explaining the system: "the estimate is checked server-side", "we copy every result to our own storage", "Demo mode: a simulated run" | Say what the person gets. System words (render, storage, server, database, provider, Stripe) never on a customer screen. |

## Measures

- Site section: heading (display size), optional one line, the content. Sections 96 px apart on desktop, 64 on phones.
- App page: `PageHeader` title, optional actions; description only when the page needs a rule stated. Content starts right under it.
- Body text 15 px, muted 13 px for meta. No 11 px text except mono data.
- A form block: title, the fields, done. Field label 14 px medium; placeholder as example; help text 13 px muted only when rule 3 above applies.
- Lists: a check icon per row is fine for plan features; nowhere else.

## How a page is reviewed

Open it at 1440 and 390 px. Read every line out loud. Cut a line if the page works without it. Then ask: would Linear, Stripe or Vercel ship this screen? If a block exists only to look like a SaaS page, it goes (log it in `docs/removed-blocks.md`).
