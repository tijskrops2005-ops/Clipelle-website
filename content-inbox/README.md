# content-inbox

Drop real customer material here for import into the site. **Quickest way (24 Oct 2026):** fill in `reviews.md`, `brands.md`, `numbers.md`, `press.md` and `links.md` in this folder (customer stories: copy `stories/_template/`; to ask a customer for a review, send them openings from `review-request.md`) and put the photos and logo files next to them; then ask Claude to import them. Everything except these templates stays out of git (photos, logos, videos and filled-in stories never go to GitHub). Nothing in this folder is published automatically; a developer formats it into `src/content/case-studies.ts` (stories) and `src/content/trust.ts` (reviews, logos, numbers, press) **exactly as supplied**: no added words, no "improvements", only formatting (headings, quote blocks, logo files, video links).

What a story needs (one folder per customer, e.g. `content-inbox/acme/`):

- `story.md`: the text in the customer's or Tijs's own words, with headings.
- `quote.txt` (optional): the exact quote plus the person's name and role, only if they agreed to be named.
- `logo.svg` or `logo.png` (optional): the customer's logo, only with permission to show it.
- `video.mp4` or a link (optional): a video the customer allows us to show.
- `permission.txt`: who gave permission to publish, and the date. **Without this file the story is not shown.**

What a review needs: the exact text, the name and role (or "anonymous"), the star rating as given, and the permission line. Reviews without a permission line stay out.

Status on 21 October 2026: this folder was empty, so `caseStudies` and `trust` are empty and the site shows "Stories coming soon" and no trust blocks in production.
