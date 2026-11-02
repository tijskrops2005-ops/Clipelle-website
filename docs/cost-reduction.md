# Cost reduction (2 Nov 2026)

Per step of both workflows: what a video costs us today, what can be saved, what it does to quality, and the risk. Numbers come from `cost_entries` on the live site (five finished translations, 24–31 s, one language, Speed, text removal on for four of them; no finished ad yet) and from `docs/cost-quality.md` for the ad workflow. Prices for customers, the credit rules and the cost guard are unchanged.

## Conclusion

| Workflow (30 s, one language) | Before | After what was built | Also possible (with a trade-off) |
|---|---|---|---|
| Translation, "Detect automatically" | $0.82 mean, $0.90 median, $1.01 p90 | ≈ $0.80 (prompt caching, admin report sampling knob) | ≈ $0.50 with own FFmpeg captions and a cheaper check model (quality test first) |
| Translation, spoken language chosen | ≈ $1.15 (an extra paid transcript session) | ≈ $0.80 (the separate transcript session is off; the proofread's own source subtitles are used, as they already were for "Detect automatically") | as above |
| Ad, 30 s Standard | ≈ $1.52 (docs/cost-quality.md; not live) | unchanged in dollars, same caching applies to the script call (≈ −$0.01) | ≈ $1.20 with a cheaper clip model and own captions |

What was built (each behind its own variable, default as stated):

1. **No separate source-transcript session** (`NEXT_PUBLIC_TRANSLATE_SOURCE_TRANSCRIPT`, default off). When a customer picks the spoken language, the workflow used to open an extra paid proofread session for the source transcript (~$0.13 for 31 s, the same per-minute price as a language). Since 28 Oct the proofread already returns the source subtitles for free on the same timing (`original_srt_url`), and the quality check used them whenever the language was "Detect automatically". Both come from the same engine, so the check sees the same text. Saving: $0.13 per 30 s per project when a source language is chosen, nothing otherwise.
2. **Prompt caching on every Claude call** (`ANTHROPIC_PROMPT_CACHE`, default on). The fixed system prompts (script, translation check, ad-tone rewrite, old-text locating) are marked cacheable; a second call within the cache window reads them at 10% of the input price. The model sees the same text, so the answer does not change. Saving: ≈ $0.003–0.01 per video; the Claude share of a translation is only ≈ 2%.
3. **Sampling knob for the admin quality report** (`QUALITY_REPORT_SAMPLE`, default 1 = every version). The report costs ≈ $0.03–0.05 per finished language version and is for us, not the customer. Set 0.5 once the reports stop finding new problems: ≈ −$0.02 per video.
4. **Faster polling with backoff** (speed round, `docs/speed.md`) also saves a little compute on Vercel/Inngest per run; not counted.

Not built, because it touches quality or needs a test first: a cheaper check model, own captions rendering, a cheaper text-removal model, fewer measurement frames. Each has a test plan below.

## CLI or MCP instead of API keys?

**No. Not cheaper, and for Anthropic not allowed.**

- Anthropic: "OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max … subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications. … Developers building products or services that interact with Claude's capabilities … should use API key authentication. … Anthropic does not permit third-party developers to … route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users. Customers may not pay for, resell, or intermediate Claude usage on their end users' behalf." (https://code.claude.com/docs/en/legal-and-compliance, read 2 Nov 2026). The Consumer Terms forbid automated access except through an API key and forbid commercial use of the consumer service (https://www.anthropic.com/legal/consumer-terms). Anthropic's MCP connector is a feature of the Messages API, billed per token with the normal key (https://platform.claude.com/docs/en/agents-and-tools/mcp-connector): no discount.
- HeyGen: the MCP server uses OAuth tied to one web account and spends that plan's credits ("no separate API charges"; https://www.heygen.com/mcp). A web plan is a seat for a person, not a licence to serve customers; the API page is explicit that the API is for "higher limits, API billing". Not production-grade for us either: one human account, web-plan concurrency and monthly credit caps, no webhooks.
- fal.ai, Shotstack, Replicate: their MCP servers and CLIs take the same API key and bill the same (fal "same platform, same pricing"; Shotstack `quote_generation` uses the same credits; Replicate's server "supports all of the operations in Replicate's HTTP API" with your key). An MCP layer adds an LLM round-trip to a pipeline that already calls the REST APIs directly: more cost and latency, not less.

Sources and the full price research: section "Prices" below. So: API keys stay; nothing to build here.

## Per step: translation workflow

Costs per 31 s video, one language, Speed, from the live runs (median per call; `cost_entries` with the step id).

| Step | Service | Cost per video | Possible saving | Quality effect | Risk | Status |
|---|---|---|---|---|---|---|
| Upload to our storage | R2 | ≈ $0.00 (R2 egress is free; storage $0.015/GB-month) | — | — | — | nothing to do |
| Remove on-screen text (optional) | Replicate `video-text-remover` (CPU) | $0.04–0.11 | A better inpainting model (`jd7h/propainter`, L40S, ≈ $0.03/run) costs the same or less and smudges less | up | medium: output must be re-tested on the test videos | proposal |
| Sound back under the cleaned picture | Shotstack remux | ≈ $0.02–0.10 (the first project paid $0.10 for 2 calls) | Own FFmpeg remux on a function: < $0.01 | none | low once we run FFmpeg (see captions) | proposal, with captions |
| Find the cleaned spot | Shotstack frames, 10 moments × 2 videos | ≈ $0.02–0.03 (frames are billed per started second, 20 of them) | Fewer moments (6) ≈ −$0.01; frames from FFmpeg ≈ $0 | none at 6 moments on the test videos; unverified beyond | low | proposal (part 3 keeps 10) |
| Proofread sessions (translate + check) | HeyGen proofread, per language | $0.13 | — | — | — | fixed by the provider |
| Source transcript session | HeyGen proofread | $0.13–0.32 only when the spoken language is chosen | **$0.13–0.32 → $0** (built) | none: the proofread's own source subtitles, same engine | low | built, flag off by default |
| Automatic quality check | Claude Sonnet 5.5 | $0.005–0.013 | Haiku 5.5 is 20× cheaper (≈ −$0.01); prompt caching (built) | unknown for Haiku: must be compared on the stored `quality_reports` lines | medium | caching built; model switch is a proposal |
| Paid render (voice, lips) | HeyGen video translation, Speed | $0.42 (≈ $0.81/min) | None at the same quality; Precision costs 2×; audio-only (no lip sync) would be ≈ half but is a different product | — | — | fixed by the provider |
| End probe (silence at the end) | Shotstack GIF | $0.02 | Only runs when "remove silence" is chosen (off by default since 29 Oct) | — | — | already conditional |
| Captions and 9:16 | Shotstack | $0.10–0.11 (20¢/min on Pay-As-You-Go) | Shotstack Scale plan 10¢/min (−$0.05); own FFmpeg on a function ≈ $0.003 (−$0.10) | none for subtitles if fonts and timing are reproduced; we would own the end probe, frames and the caption box | high: rendering code, fonts, testing on every caption style | proposal with test plan |
| Admin quality report | Claude + HeyGen transcription + Shotstack frames | $0.03–0.05 | Sampling knob (built); Batch API −50% for the Claude part (not latency-critical) | none for customers | low | knob built; batch is a proposal |
| Storage of results | R2 | ≈ $0.001/month per video | Delete intermediates (cleaned picture, remux, probes) after completion | none | low | proposal (R2 is cheap; not worth the code yet) |
| Hosting, jobs, database | Vercel Pro, Inngest, Supabase Pro | fixed monthly; ≈ $0.01 per video in compute | shorter polls (built) | none | — | — |

Totals: before ≈ $0.82 (auto) / ≈ $1.15 (chosen source); after ≈ $0.80 / ≈ $0.80. With the proposals (own captions, Haiku check, propainter) ≈ $0.50–0.55.

## Per step: ad workflow (not live; from docs/cost-quality.md)

| Step | Service | Cost per 30 s ad | Possible saving | Quality effect | Status |
|---|---|---|---|---|---|
| Script (+ one shortening pass) | Claude Opus 5.5 | ≈ $0.05–0.08 | Prompt caching (built, ≈ −$0.01); Sonnet 5.5 for the shortening pass only (−$0.02) | the first draft decides the ad: keep Opus; shortening is mechanical | caching built, Sonnet-for-shortening proposal |
| Product clip | fal.ai image-to-video (date-based default model) | ≈ $0.35–0.70 | PixVerse V6 at $0.005/s is 10× cheaper than Kling (but visibly weaker); MiniMax Turbo $0.025/s | down for cheap models | proposal: A/B on three products |
| Presenter | HeyGen Avatar III | ≈ $0.50 (Avatar IV ≈ $1.50) | none at the same look | — | fixed |
| Final edit (captions, overlays) | Shotstack | ≈ $0.10–0.15 | as above (own FFmpeg or Scale plan) | none | proposal |
| Total | | ≈ $1.52 | ≈ $1.20 | | |

## Other things checked

- **Batch / async at the providers**: Anthropic Batch API gives −50% but answers within up to 24 h, so it fits only the admin quality report, not the pre-render check (on the critical path). HeyGen, fal, Shotstack have no batch discount; Shotstack's cheaper plans are the only volume lever (10¢/min at 2,000 min/month).
- **Double renders**: none in the translate workflow today (one HeyGen render, one caption render per language; the sound remux and the probes are extra small renders). A retry after a HeyGen moderation hold no longer pays twice (27 Oct).
- **Cache of results for the same input**: "Add a language" (31 Oct) reuses the stored upload; it does not yet reuse the source transcript, because the proofread is per target language anyway. A second translation of the same video into the same language costs the same again; a per-source cache would only help duplicates, which we have not seen.
- **Smaller uploads and intermediates**: the browser already PUTs the raw file to R2; HeyGen receives the file once. Intermediates stay in R2 (cheap). Nothing to gain today.
- **Volume prices**: Anthropic negotiates case by case; HeyGen is Pay-As-You-Go with an Enterprise contract rate (also 20 instead of 10 concurrent jobs); Shotstack's plans are the real lever; fal and Replicate have enterprise-only discounts.

## Test plans for the proposals

1. **Haiku 5.5 for the translation check**: run the stored source/target lines of the five live translations through Haiku and Sonnet (free of provider cost beyond ≈ $0.10 in tokens), compare the corrections line by line; accept if Haiku misses nothing Sonnet caught on names, numbers and the call to action. Switch with `TRANSLATE_CHECK_MODEL=claude-haiku-5-5` (variable to add then).
2. **Own captions rendering (FFmpeg on a Vercel or Lambda function)**: render the three test videos with the current Shotstack caption styles and with FFmpeg + libass, compare frames at the same moments; accept when the fonts, word highlight, bar and two-line rule match. Saves ≈ $0.10 per language version and the frame/probe costs; costs a week of work.
3. **propainter for text removal**: run the four test videos with text; compare the smudge with `measureRemovedText`; accept when the band is no larger and the picture under it is cleaner.
4. **Cheaper clip models for ads**: three products × two models, judged by Tijs; only after ads come back.

## Prices (read 2 Nov 2026)

- Anthropic per MTok: Opus 5.5 $4 in / $20 out (cache write $5, read $0.20); Sonnet 5.5 $2 / $10 (write $2.50, read $0.10); Haiku 5.5 $0.10 / $0.50; Batch API −50% (https://platform.claude.com/docs/en/about-claude/pricing).
- HeyGen API: Pay-As-You-Go in dollars, no free API credits since Feb 2026, PAYG balance expires after 12 months, 10 concurrent jobs (Enterprise 20) (https://help.heygen.com/en/articles/10060327-heygen-api-pricing-explained, https://developers.heygen.com/docs/usage-limits); Avatar III ≈ $1.00/min, Avatar IV $3/min (https://www.heygen.com/blog/ai-video-generator-pricing). The translation per-minute table sits behind the login; the rates in `src/lib/pricing.ts` are the last verified ones.
- Shotstack: PAYG 20¢/min, Starter 15.6¢, Pro 13.2¢, Scale 10¢ (2,000 min), Volume 5¢ (https://shotstack.io/pricing/).
- fal.ai image-to-video: Kling 2.5/2.6 Pro $0.07/s, Kling 3 $0.14/s, MiniMax H3 Max $0.05/s (Turbo $0.025/s), PixVerse V6 $0.005/s (https://fal.ai/pricing).
- Replicate: `hjunior29/video-text-remover` ≈ $0.0068 per run on CPU (https://replicate.com/hjunior29/video-text-remover); `jd7h/propainter` ≈ $0.032 per run (https://replicate.com/jd7h/propainter).
- Cloudflare R2: $0.015/GB-month, free egress (https://developers.cloudflare.com/r2/pricing/). Vercel Pro $20/seat with $20 usage credit; Fluid compute $0.184 per active CPU hour (https://vercel.com/docs/functions/usage-and-pricing). Supabase Pro $25/month (https://supabase.com/pricing).
- Alternatives: ElevenLabs Dubbing $0.50/min without lip sync (https://elevenlabs.io/pricing/api) plus Sync Labs lip sync $3/min (https://sync.so/pricing) ≈ $3.50/min, dearer than HeyGen Speed; Rask $3/min overage (https://www.rask.ai/pricing); AWS Lambda FFmpeg ≈ $0.003 per 30 s render (https://aws.amazon.com/lambda/pricing/); json2video ≈ 20–25¢/min (https://json2video.com/pricing/); Creatomate ≈ 14 credits per 720p minute (https://creatomate.com/docs/account/how-does-the-pricing-work).
