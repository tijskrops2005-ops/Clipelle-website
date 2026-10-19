"use client";

import { config } from "@/lib/config";
import type {
  AdProject,
  LanguageCode,
  Project,
  Segment,
  StepKey,
  TranslateProject,
  TranslateStepKey,
} from "@/lib/types";
import { getProjectsSnapshot, subscribeToProjects, updateProject } from "./store";
import { demoDetectedLanguage, demoSegments } from "./translations";

/**
 * SIMULATED WORKFLOW RUNNER — demo only.
 * Advances processing projects on a timer so the UI can show the full flow.
 *
 * Workflow A (ad): product clip and presenter run in parallel, the final edit
 * starts when both are done.
 * Workflow B (translate): upload → translate → review (waits for the user) →
 * captions → done, with one result per target language.
 *
 * Stage 8 replaces this with the real orchestrator (server-side, webhooks/polling).
 *
 * Testing hook: a project whose name (or product name) contains "fail" fails
 * at the presenter step (A) or the translate step (B) on its first attempt.
 * Retry succeeds.
 */
const AD_DURATION_MS: Record<StepKey, number> = {
  script: 4_000,
  productClip: 7_000,
  presenter: 11_000,
  finalEdit: 8_000,
};

const TRANSLATE_DURATION_MS: Record<TranslateStepKey, number> = {
  upload: 2_000,
  translate: 10_000,
  review: 0, // waits for the user
  captions: 6_000,
};

const AD_FAIL_MESSAGE =
  "The presenter video could not be generated. The script was rejected by the voice service. Check the script for unsupported characters and try again.";

const TRANSLATE_FAIL_MESSAGE =
  "The translation service could not process this video. The audio track was too quiet to transcribe. Check that the speaker is clearly audible and try again.";

function wantsFailure(project: Project) {
  const haystack = `${project.name} ${project.workflow === "ad" ? project.productName : ""}`.toLowerCase();
  return haystack.includes("fail");
}

/* ---------------- Workflow A ---------------- */

function tickAd(project: AdProject, now: number, nowIso: string) {
  for (const key of ["script", "productClip", "presenter", "finalEdit"] as const) {
    const step = project.steps[key];
    if (step.status !== "processing") continue;

    // Normalise the start time the first time we see this step running
    // (seed data has old timestamps; a reload restarts the clock).
    const startedAt = step.startedAt ? Date.parse(step.startedAt) : NaN;
    if (Number.isNaN(startedAt) || now - startedAt > AD_DURATION_MS[key] * 3) {
      updateProject(project.id, (p) =>
        p.workflow === "ad"
          ? { ...p, steps: { ...p.steps, [key]: { ...p.steps[key], startedAt: nowIso, attempt: p.steps[key].attempt ?? 1 } } }
          : p,
      );
      continue;
    }

    if (now - startedAt < AD_DURATION_MS[key]) continue;

    if (key === "presenter" && (step.attempt ?? 1) === 1 && wantsFailure(project)) {
      updateProject(project.id, (p) =>
        p.workflow === "ad"
          ? {
              ...p,
              status: "failed",
              steps: { ...p.steps, [key]: { ...p.steps[key], status: "failed", finishedAt: nowIso, error: AD_FAIL_MESSAGE } },
            }
          : p,
      );
      continue;
    }

    updateProject(project.id, (p) => {
      if (p.workflow !== "ad") return p;
      const steps = {
        ...p.steps,
        [key]: { ...p.steps[key], status: "completed" as const, finishedAt: nowIso, outputUrl: key === "script" ? undefined : config.demoVideoUrl },
      };
      const finished = key === "finalEdit";
      return {
        ...p,
        steps,
        status: finished ? "completed" : p.status,
        finalVideoUrl: finished ? config.demoVideoUrl : p.finalVideoUrl,
      };
    });
  }

  // The script gates the two parallel steps; the final edit starts only when both are ready.
  const latest = getProjectsSnapshot().find((p) => p.id === project.id);
  if (
    latest &&
    latest.workflow === "ad" &&
    latest.status === "processing" &&
    latest.steps.script.status === "completed" &&
    latest.steps.productClip.status === "waiting" &&
    latest.steps.presenter.status === "waiting"
  ) {
    updateProject(latest.id, (p) =>
      p.workflow === "ad"
        ? {
            ...p,
            steps: {
              ...p.steps,
              productClip: { status: "processing", startedAt: nowIso, attempt: 1 },
              presenter: { status: "processing", startedAt: nowIso, attempt: 1 },
            },
          }
        : p,
    );
    return;
  }
  if (
    latest &&
    latest.workflow === "ad" &&
    latest.status === "processing" &&
    latest.steps.productClip.status === "completed" &&
    latest.steps.presenter.status === "completed" &&
    latest.steps.finalEdit.status === "waiting"
  ) {
    updateProject(latest.id, (p) =>
      p.workflow === "ad"
        ? { ...p, steps: { ...p.steps, finalEdit: { status: "processing", startedAt: nowIso, attempt: 1 } } }
        : p,
    );
  }
}

/* ---------------- Workflow B ---------------- */

const TRANSLATE_ORDER: TranslateStepKey[] = ["upload", "translate", "review", "captions"];

function tickTranslate(project: TranslateProject, now: number, nowIso: string) {
  const key = TRANSLATE_ORDER.find((k) => project.steps[k].status === "processing");
  if (!key || key === "review") return;
  const step = project.steps[key];

  const startedAt = step.startedAt ? Date.parse(step.startedAt) : NaN;
  if (Number.isNaN(startedAt) || now - startedAt > TRANSLATE_DURATION_MS[key] * 3) {
    updateProject(project.id, (p) =>
      p.workflow === "translate"
        ? { ...p, steps: { ...p.steps, [key]: { ...p.steps[key], startedAt: nowIso, attempt: p.steps[key].attempt ?? 1 } } }
        : p,
    );
    return;
  }
  if (now - startedAt < TRANSLATE_DURATION_MS[key]) return;

  if (key === "translate" && (step.attempt ?? 1) === 1 && wantsFailure(project)) {
    updateProject(project.id, (p) =>
      p.workflow === "translate"
        ? {
            ...p,
            status: "failed",
            steps: { ...p.steps, translate: { ...p.steps.translate, status: "failed", finishedAt: nowIso, error: TRANSLATE_FAIL_MESSAGE } },
          }
        : p,
    );
    return;
  }

  updateProject(project.id, (p) => {
    if (p.workflow !== "translate") return p;
    const done = { ...p.steps[key], status: "completed" as const, finishedAt: nowIso };

    switch (key) {
      case "upload":
        return {
          ...p,
          steps: { ...p.steps, upload: done, translate: { status: "processing", startedAt: nowIso, attempt: 1 } },
        };
      case "translate": {
        // Translation finished: fill the fragments per language and hand over to the user.
        const detected = demoDetectedLanguage(p);
        return {
          ...p,
          status: "review",
          detectedLanguage: detected,
          translations: p.translations.map((t) => ({
            ...t,
            status: "waiting",
            segments: t.segments.length ? t.segments : demoSegments(p.sourceSeconds, detected, t.language),
          })),
          steps: { ...p.steps, translate: done, review: { status: "needs_input", startedAt: nowIso } },
        };
      }
      case "captions":
        return {
          ...p,
          status: "completed",
          translations: p.translations.map((t) => ({ ...t, status: "completed", videoUrl: config.demoVideoUrl })),
          steps: { ...p.steps, captions: done },
        };
      default:
        return p;
    }
  });
}

function tick() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  for (const project of getProjectsSnapshot()) {
    if (project.status !== "processing") continue;
    if (project.workflow === "ad") tickAd(project, now, nowIso);
    else tickTranslate(project, now, nowIso);
  }
}

let stop: (() => void) | null = null;

/** Starts the timer once per browser tab. Returns a function that stops it. */
export function startDemoRunner() {
  if (stop) return stop;
  const interval = window.setInterval(tick, 1000);
  const unsubscribe = subscribeToProjects(() => {
    /* store changes re-render subscribers; the timer does the advancing */
  });
  stop = () => {
    window.clearInterval(interval);
    unsubscribe();
    stop = null;
  };
  return stop;
}

/** Puts a failed ad step back to processing and resumes the project. */
export function retryStep(projectId: string, key: StepKey) {
  const nowIso = new Date().toISOString();
  updateProject(projectId, (p) =>
    p.workflow === "ad"
      ? {
          ...p,
          status: "processing",
          steps: { ...p.steps, [key]: { status: "processing", startedAt: nowIso, attempt: (p.steps[key].attempt ?? 1) + 1 } },
        }
      : p,
  );
}

/** Same for a failed translate step. */
export function retryTranslateStep(projectId: string, key: TranslateStepKey) {
  const nowIso = new Date().toISOString();
  updateProject(projectId, (p) =>
    p.workflow === "translate"
      ? {
          ...p,
          status: "processing",
          steps: { ...p.steps, [key]: { status: "processing", startedAt: nowIso, attempt: (p.steps[key].attempt ?? 1) + 1 } },
        }
      : p,
  );
}

/** Saves edited fragments for one language while the project waits for review. */
export function saveReviewedSegments(projectId: string, language: LanguageCode, segments: Segment[]) {
  updateProject(projectId, (p) =>
    p.workflow === "translate"
      ? { ...p, translations: p.translations.map((t) => (t.language === language ? { ...t, segments } : t)) }
      : p,
  );
}

/** The user approved every translation: review is done, captions start (simulated). */
export function approveReview(projectId: string) {
  const nowIso = new Date().toISOString();
  updateProject(projectId, (p) =>
    p.workflow === "translate" && p.steps.review.status === "needs_input"
      ? {
          ...p,
          status: "processing",
          translations: p.translations.map((t) => ({ ...t, status: "processing" })),
          steps: {
            ...p.steps,
            review: { ...p.steps.review, status: "completed", finishedAt: nowIso },
            captions: { status: "processing", startedAt: nowIso, attempt: 1 },
          },
        }
      : p,
  );
}
