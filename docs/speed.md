# Speed (2 Nov 2026)

Goal: at most 5 minutes per video. Measured from the step timestamps of the five finished translations on the live site (24–31 s videos, one language, Speed; text removal on for four of them). No finished ad on the live site yet; the ad numbers come from the one measured run of 19 Oct (356 s for a 30 s Standard ad).

## Conclusion

| Workflow | Before (measured) | After (expected) | Under 5 minutes? |
|---|---|---|---|
| Translation, 30 s, one language, no text removal | ≈ 5.5 min (the one run without removal: 271 s for 8 s of video; ≈ 330 s expected for 30 s) | ≈ 4.5–5 min | yes, usually |
| Translation, 30 s, with text removal | 7.4 min median (446 s), 10.9 min p90 (651 s) | ≈ 6–6.5 min | no: the removal (60–90 s) and the extra remux and measurement renders add ≈ 2 min |
| Translation, several languages | same as one language plus a little (languages run side by side) | same | as above |
| Ad, 30 s Standard | ≈ 6 min (356 s, one run) | ≈ 5–5.5 min | borderline; the presenter render is ≈ 3 min on its own |

Where the time goes (translation with removal, median): upload step 122 s = text removal (Replicate, ≈ 60–70 s) + sound remux (Shotstack, ≈ 20–40 s) + 20 measurement frames (Shotstack, ≈ 20 s); translate step 99 s = proofread sessions (HeyGen, ≈ 70–80 s) + quality check (Claude, ≈ 10–20 s); captions step 151 s = HeyGen render (≈ 90–110 s) + Shotstack captions (≈ 30–40 s). About 85% of the wall time is inside the providers' queues and renders, outside our control. Our own part (polling gaps, sequential checks, copies to storage) was ≈ 40–60 s and is now ≈ 15–25 s.

What it would take to get every video under 5 minutes: (1) own captions rendering on a function (FFmpeg, ≈ 10 s instead of 30–40 s in the Shotstack queue; also the remux and the frames), ≈ a week of work, saves ≈ 1 min; (2) a faster text remover (`propainter` on an L40S runs in ≈ 33 s instead of ≈ 68 s on CPU, ≈ $0.03 per run), saves ≈ 35 s; (3) HeyGen's own render time cannot be bought down: Speed takes ≈ 3–4× the video length, Precision more. With (1) and (2) a 30 s video with text removal lands at ≈ 4.5 min.

## What was built

- **Phase log per language**: `setLanguagePhase` now appends every phase change (voice → enhance → captions → done) to `steps.output.phaseLog[code]`, next to the current phase. From now on `docs/speed.md` can be updated with the exact voice and captions durations instead of the combined captions step.
- **Shorter polling with backoff** (`pollDelaySeconds` in `src/lib/workflow/steps.ts`): where no webhook exists (the proofread sessions, the text remover) the run checks after 3, 5, 8, 11 … seconds up to twice the configured interval, instead of a fixed 8 s. Jobs that finish early are picked up ≈ 5 s sooner per wait; the webhook waits (HeyGen render, Shotstack, fal) were already instant.
- **Quality checks side by side**: with several target languages the Claude check of every language ran one after the other; they now run in parallel (one call each). Saves ≈ 10–15 s per extra language.
- **An honest expected time on the project page**: the stage expectations in `src/content/measured.ts` are recalibrated on the live runs (upload incl. removal 122 s, translate 99 s, voice + captions 151 s), so the "about N min left" on the project page follows what the live site really does; `measuredTranslateRun` keeps the median and p90 for the site copy. The bar still says "taking a little longer" past 1.5× the expectation.
- Already in place and kept: product clip and presenter run side by side after the script (ads); language versions run side by side; webhooks wake the run for HeyGen, fal and Shotstack; one run per project.

## Measured, per step (translation, seconds)

| Step | n | Median | p90 | Inside it |
|---|---|---|---|---|
| upload (incl. text removal, remux, measurement) | 5 | 122 | 128 | Replicate ≈ 60–70, Shotstack remux + frames ≈ 40–50 |
| translate (proofread + check) | 5 | 99 | 123 | HeyGen ≈ 70–80, Claude 10–20 |
| captions (HeyGen render + Shotstack captions) | 5 | 151 | 179 | HeyGen ≈ 90–110, Shotstack 30–40 |
| start → ready | 5 | 446 | 651 | |

The one run without text removal (8 s video, 19 Oct) took 271 s in all. Phase-level numbers (voice vs captions) start accumulating with the phase log built today.

## Not changed on purpose

- HeyGen Precision stays available: slower and dearer, but it is the quality option.
- Upload to our storage before HeyGen: the copy is needed so that a retry never depends on a provider URL.
- The 10 measurement frames for the cleaned spot: the caption box depends on them (part 3); 6 would save ≈ 8 s and is a proposal in `docs/cost-reduction.md`.
