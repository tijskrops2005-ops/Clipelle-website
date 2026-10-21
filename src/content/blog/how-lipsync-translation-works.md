---
title: "How lipsync translation works, in plain words"
slug: "how-lipsync-translation-works"
date: "2026-09-29"
category: "translation"
tags: ["lipsync", "translation", "dubbing", "quality check"]
summary: "What changes and what stays the same when a video is translated with lipsync, step by step, and how to choose between Speed and Precision."
---

Translating a video used to mean one of two compromises. Subtitles keep the original voice and ask the viewer to read. Dubbing swaps in another voice while the mouth keeps forming the old words, which everyone notices and nobody enjoys. Lipsync translation changes the third thing: the mouth. The speaker appears to say the new language, in a voice that still sounds like them.

This article explains what actually happens between uploading a video and getting a translated one back, using Reelay's [Translate & lipsync](/platform/translate) as the concrete case. No technical background needed.

## Three things change, one does not

A lipsync translation touches three parts of a video.

**The words.** The speech is transcribed, translated and timed so each translated sentence fits the slot where the original one was spoken.

**The voice.** The new sentences are spoken in the original speaker's own voice. The result is not a different voice actor; it is the same person's voice, now speaking a language they may not know.

**The mouth.** Lip movements are matched to the new sounds, so that the "m" in the translated word closes the lips where the original word had the mouth open.

What does not change: everything else in the frame. The room, the gestures, the product in the speaker's hand, the cuts. And the video keeps its length, which is why timing turns out to be the hard part.

## Step by step

Here is the whole path as it runs in Reelay.

### 1. Upload a video you own

The limits are 32 MB and 3 minutes. Before anything starts, you confirm that you own the rights to the video and have the speaker's permission to use their voice and face. This is not a formality: the output is a video of a real person saying things they never said, and the only acceptable basis for that is their agreement.

### 2. Say what language is spoken

Pick the spoken language or let it be detected. Detection works well on clear speech; if the video mixes languages or has a heavy accent, picking it yourself removes a source of error.

### 3. Pick the target languages

One or more of 190 languages and regional variants. Regional variants matter more than people expect: the same language spoken in two countries can differ in vocabulary, formality and the words for everyday objects, and the voice should sound like it belongs where the viewer lives. A target that equals the source is refused, which saves a confused result.

### 4. Transcript and translation

The spoken words become a transcript, and the transcript becomes one translation per target language, each line keeping its timing.

### 5. The automatic quality check

Before any paid rendering, Reelay compares every translated line with the original and looks for missing or added words, changes of meaning, wrong numbers, mangled names and phrasing that no native speaker would use. Corrections are made within the timing limits of each line, so a fix never makes a sentence too long for its slot. The changes and any warnings are shown on the project page, so you can see what was touched and why.

### 6. Voice and mouth

The corrected translation is spoken in the speaker's own voice and the lips are matched to it. This is where the Speed or Precision choice applies, explained below.

### 7. Finishing

Captions are burned in, positioned low or in the middle of the frame. You choose 9:16 or the original format. Silence at the start and end is trimmed. Optional picture enhancement can sharpen a soft source. Each language version is a separate result on the project page.

## Why timing is the hard part

Languages do not take the same time to say the same thing. A sentence that fits comfortably in three seconds of one language may need four in another, or two and a half. The video does not stretch, so the translation has to. Translators do this instinctively by choosing shorter synonyms, dropping a filler word or restructuring a sentence. The automatic quality check applies the same discipline: when it corrects a line, the correction has to fit the slot the original line occupied.

For you, this means two things. Speak at a natural pace in the source video and leave small pauses between sentences; a breathless original gives the translation nowhere to go. And keep sentences short, because a short sentence has many ways to be translated into the same duration and a long one has few.

## Speed or Precision

Reelay offers two lipsync modes.

**Speed** is standard lipsync. The mouth is matched to the new speech in the way that works for most talking-head content: a presenter mid-frame, a founder explaining a product, a how-to. It is faster and costs less.

**Precision** redraws the mouth region, which gives a more faithful match on close-ups where the lips are large on screen and any mismatch would be visible. It takes longer and costs more. The form shows the estimate for your chosen languages in each mode before you start.

The practical rule: choose by how big the mouth is on screen. A head-and-shoulders shot from a phone's distance is Speed territory. A face that fills a 9:16 frame is where Precision earns its cost. If a video is going to many languages, you can also mix: Precision for the market that matters most, Speed for the markets you are testing.

## The brand glossary

Product names, feature names and taglines should survive translation unchanged. The brand glossary is a list of terms to keep; the translation leaves them as written, and the quality check treats them as fixed points when it checks names. Fill it in before the first translation rather than after you spot a product name turned into a common noun.

## What to check yourself

The automatic check catches the mechanical errors. Two things still deserve a human minute.

- **Numbers and names.** They are flagged when wrong, but watch the finished version with the captions on anyway; a price or a model number is the one thing you cannot afford to have slip.
- **One native read per language, the first time.** Not for every video, but when you add a language, have someone who speaks it watch the first result. Register, politeness level and humor are where a correct translation can still be the wrong one. The [localization checklist](/blog/localization-checklist-for-product-videos) has the full list of things to look for.

## Limits worth knowing

Lipsync works on the mouth it can see. A clear, front-facing speaker gives the method the most to work with; a speaker who keeps turning away or is small in the frame gives it less. Captions already burned into the source stay in the source language, so start from a clean version. And the input limits, 32 MB and 3 minutes, mean long videos should be cut into parts before upload.

## What this makes possible

A video you recorded once can speak to every market you sell in, with your own voice and your own face, without a reshoot or a studio. The step-by-step above is what happens between "upload" and "download"; [One video, ten languages, no reshoot](/blog/one-video-ten-languages-no-reshoot) is about what to do with it.
