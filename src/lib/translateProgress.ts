import { translateStages } from "@/content/measured";
import type { LanguageCode, Step, StepStatus, Translation } from "@/lib/types";

/**
 * One progress for a translation (27 Oct 2026, Tijs: the customer should see one thing being built,
 * not three technical steps). Pure and browser-safe: from the project's steps, the phase of every
 * language version and the clock it derives a percentage, the minutes left, a checklist of stages in
 * plain words and the state per language. Stage expectations come from src/content/measured.ts.
 *
 * Inside a running stage the fraction follows 1 − e^(−2.2·t/expected), capped at 96%, so the bar
 * keeps moving but never finishes on its own; a stage past 1.5× its expectation is "overdue" and the
 * page says it is taking a little longer instead of showing a minute count.
 */
export type StageKey = "upload" | "removeText" | "translate" | "voice" | "enhance" | "captions";
export type StageState = "done" | "active" | "todo" | "failed";
export type LanguageState = "waiting" | "active" | "ready" | "failed";

export type ProgressInput = {
  status: "draft" | "processing" | "review" | "completed" | "failed";
  createdAt: string;
  steps: Record<"upload" | "translate" | "captions", Step>;
  translations: Pick<Translation, "language" | "status" | "phase" | "error">[];
  targetLanguages: LanguageCode[];
  sourceSeconds: number;
  enhance?: boolean;
  removeText?: boolean;
  speaker?: "original" | "presenter";
};

export type StageView = { key: StageKey; label: string; doneLabel: string; state: StageState };
export type LanguageView = { code: LanguageCode; state: LanguageState; percent: number; label: string; error?: string };
export type TranslateProgress = {
  /** 0–100, never above 99 until the project is completed. */
  percent: number;
  /** Whole minutes still expected; null when a stage is overdue (then say "a little longer"). */
  minutesLeft: number | null;
  overdue: boolean;
  stages: StageView[];
  languages: LanguageView[];
  /** What is happening right now, in one line. */
  current: string;
};

const LABELS: Record<StageKey, { label: string; doneLabel: string; presenterLabel?: string; presenterDone?: string }> = {
  upload: { label: "Uploading your video", doneLabel: "Video uploaded" },
  removeText: { label: "Removing the old on-screen text", doneLabel: "Old text removed" },
  translate: { label: "Writing out and checking every line", doneLabel: "Every line checked" },
  voice: { label: "Recording the new voice and matching the lips", doneLabel: "Voice recorded, lips matched", presenterLabel: "Recording the presenter", presenterDone: "Presenter recorded" },
  enhance: { label: "Sharpening the picture", doneLabel: "Picture sharpened" },
  captions: { label: "Adding captions", doneLabel: "Captions added" },
};

const K = 2.2;
const CAP = 0.96;
const OVERDUE_AT = 1.5;

export function expectedSeconds(stage: StageKey, sourceSeconds: number) {
  const e = translateStages[stage];
  return e.base + e.perSecond * Math.max(0, sourceSeconds);
}

function runningFraction(elapsedMs: number, expectedSec: number) {
  if (elapsedMs <= 0) return 0;
  return Math.min(CAP, 1 - Math.exp((-K * elapsedMs) / 1000 / expectedSec));
}

type Part = { key: StageKey; weight: number; fraction: number; state: StageState; overdue: boolean; remaining: number };

function stepPart(key: StageKey, status: StepStatus, startedAt: string | undefined, sourceSeconds: number, now: number): Part {
  const expected = expectedSeconds(key, sourceSeconds);
  if (status === "completed") return { key, weight: expected, fraction: 1, state: "done", overdue: false, remaining: 0 };
  if (status === "failed") return { key, weight: expected, fraction: 0, state: "failed", overdue: false, remaining: expected };
  if (status === "processing") {
    const elapsed = startedAt ? now - Date.parse(startedAt) : 0;
    const fraction = runningFraction(elapsed, expected);
    return { key, weight: expected, fraction, state: "active", overdue: elapsed > OVERDUE_AT * expected * 1000, remaining: Math.max(0, expected - elapsed / 1000) };
  }
  return { key, weight: expected, fraction: 0, state: "todo", overdue: false, remaining: expected };
}

/** The upload step covers the text removal too; with removal on, its time is split in two stages shown one after the other. */
function uploadParts(p: ProgressInput, now: number): Part[] {
  const step = p.steps.upload;
  const up = stepPart("upload", step.status, step.startedAt, p.sourceSeconds, now);
  if (!p.removeText) return [up];
  const removal = expectedSeconds("removeText", p.sourceSeconds);
  if (step.status !== "processing") return [{ ...up, key: "removeText", weight: removal, remaining: up.state === "done" ? 0 : removal }, up];
  const elapsed = step.startedAt ? now - Date.parse(step.startedAt) : 0;
  const removing = elapsed < removal * 1000;
  const rem: Part = removing
    ? { key: "removeText", weight: removal, fraction: runningFraction(elapsed, removal), state: "active", overdue: false, remaining: Math.max(0, removal - elapsed / 1000) }
    : { key: "removeText", weight: removal, fraction: 1, state: "done", overdue: false, remaining: 0 };
  const upElapsed = Math.max(0, elapsed - removal * 1000);
  const expected = expectedSeconds("upload", p.sourceSeconds);
  const upPart: Part = removing
    ? { key: "upload", weight: expected, fraction: 0, state: "todo", overdue: false, remaining: expected }
    : { key: "upload", weight: expected, fraction: runningFraction(upElapsed, expected), state: "active", overdue: upElapsed > OVERDUE_AT * expected * 1000, remaining: Math.max(0, expected - upElapsed / 1000) };
  return [rem, upPart];
}

const LANGUAGE_ORDER: ("voice" | "enhance" | "captions")[] = ["voice", "enhance", "captions"];

/** The stages of one language version after the translation: voice → (enhance) → captions, from its phase. */
function languageParts(p: ProgressInput, t: ProgressInput["translations"][number] | undefined, now: number): Part[] {
  const keys = LANGUAGE_ORDER.filter((k) => k !== "enhance" || p.enhance);
  const captions = p.steps.captions;
  const translateDone = p.steps.translate.status === "completed";
  if (t?.status === "completed" || (!t && p.status === "completed")) return keys.map((key) => ({ key, weight: expectedSeconds(key, p.sourceSeconds), fraction: 1, state: "done", overdue: false, remaining: 0 }));
  if (t?.status === "failed") return keys.map((key) => ({ key, weight: expectedSeconds(key, p.sourceSeconds), fraction: 0, state: "failed", overdue: false, remaining: 0 }));
  // Where is it: its own phase, or the start of the captions step when no phase was written yet.
  const phaseKey = t?.phase?.key ?? (captions.status === "processing" && translateDone ? "voice" : null);
  const phaseAt = t?.phase?.at ?? captions.startedAt;
  const index = phaseKey === "done" ? keys.length : phaseKey ? keys.indexOf(phaseKey as (typeof keys)[number]) : -1;
  return keys.map((key, i) => {
    const expected = expectedSeconds(key, p.sourceSeconds);
    if (i < index) return { key, weight: expected, fraction: 1, state: "done", overdue: false, remaining: 0 };
    if (i === index) {
      const elapsed = phaseAt ? now - Date.parse(phaseAt) : 0;
      return { key, weight: expected, fraction: runningFraction(elapsed, expected), state: "active", overdue: elapsed > OVERDUE_AT * expected * 1000, remaining: Math.max(0, expected - elapsed / 1000) };
    }
    return { key, weight: expected, fraction: 0, state: "todo", overdue: false, remaining: expected };
  });
}

function labelOf(key: StageKey, presenter: boolean, done: boolean) {
  const l = LABELS[key];
  if (presenter && key === "voice") return done ? l.presenterDone! : l.presenterLabel!;
  return done ? l.doneLabel : l.label;
}

export function translateProgress(p: ProgressInput, now = Date.now()): TranslateProgress {
  const presenter = p.speaker === "presenter";
  const shared = [...uploadParts(p, now), stepPart("translate", p.steps.translate.status, p.steps.translate.startedAt, p.sourceSeconds, now)];
  const byLanguage = p.targetLanguages.map((code) => ({ code, t: p.translations.find((x) => x.language === code), parts: languageParts(p, p.translations.find((x) => x.language === code), now) }));
  const languageWeight = byLanguage[0]?.parts.reduce((a, x) => a + x.weight, 0) ?? 0;
  const languageFraction = byLanguage.length ? byLanguage.reduce((a, l) => a + l.parts.reduce((s, x) => s + x.weight * x.fraction, 0) / Math.max(1, languageWeight), 0) / byLanguage.length : 0;
  const sharedWeight = shared.reduce((a, x) => a + x.weight, 0);
  const sharedDone = shared.reduce((a, x) => a + x.weight * x.fraction, 0);
  const total = sharedWeight + languageWeight;
  const raw = total > 0 ? (sharedDone + languageWeight * languageFraction) / total : 0;
  const percent = p.status === "completed" ? 100 : Math.min(99, Math.max(p.status === "draft" ? 0 : 1, Math.round(raw * 100)));

  // Minutes left: the shared stages in sequence, then the slowest language (they run side by side).
  const sharedRemaining = shared.reduce((a, x) => a + x.remaining, 0);
  const languageRemaining = Math.max(0, ...byLanguage.map((l) => l.parts.reduce((a, x) => a + x.remaining, 0)));
  const overdue = shared.some((x) => x.overdue) || byLanguage.some((l) => l.parts.some((x) => x.overdue));
  const minutesLeft = p.status === "completed" ? 0 : overdue ? null : Math.max(1, Math.ceil((sharedRemaining + languageRemaining) / 60));

  // The checklist: shared stages, then the language stages summarised (done when every language passed them).
  const stageViews: StageView[] = shared.map((x) => ({ key: x.key, label: labelOf(x.key, presenter, false), doneLabel: labelOf(x.key, presenter, true), state: x.state }));
  const languageKeys = byLanguage[0]?.parts.map((x) => x.key) ?? [];
  for (const [i, key] of languageKeys.entries()) {
    const states = byLanguage.map((l) => l.parts[i].state);
    const state: StageState = states.every((s) => s === "done") ? "done" : states.some((s) => s === "active") ? "active" : states.every((s) => s === "failed") ? "failed" : states.some((s) => s === "done") ? "active" : "todo";
    stageViews.push({ key, label: labelOf(key, presenter, false), doneLabel: labelOf(key, presenter, true), state });
  }
  if (p.status === "failed") for (const s of stageViews) if (s.state === "active") s.state = "failed";

  const languages: LanguageView[] = byLanguage.map((l) => {
    const w = l.parts.reduce((a, x) => a + x.weight, 0) || 1;
    const pct = Math.round((l.parts.reduce((a, x) => a + x.weight * x.fraction, 0) / w) * 100);
    const active = l.parts.find((x) => x.state === "active");
    if (l.t?.status === "completed") return { code: l.code, state: "ready", percent: 100, label: "Ready" };
    if (l.t?.status === "failed") return { code: l.code, state: "failed", percent: pct, label: "Stopped", error: l.t.error };
    if (active) return { code: l.code, state: "active", percent: Math.min(99, pct), label: labelOf(active.key, presenter, false) };
    return { code: l.code, state: "waiting", percent: Math.min(99, pct), label: "Waiting for the translation" };
  });

  const activeShared = shared.find((x) => x.state === "active");
  const current = p.status === "completed" ? "Ready" : p.status === "failed" ? "Stopped" : activeShared ? labelOf(activeShared.key, presenter, false) : languages.find((l) => l.state === "active")?.label ?? (p.status === "draft" ? "Not started" : "Starting");

  return { percent, minutesLeft, overdue, stages: stageViews, languages, current };
}

/** The stage names for the strip above the translate form, from the same list as the progress card. */
export function translateStageStrip(presenter: boolean) {
  return ["Upload", "Translate & check", presenter ? "AI presenter" : "Voice & lip sync", "Captions"];
}
