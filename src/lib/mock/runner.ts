"use client";

import { config } from "@/lib/config";
import type { Project, StepKey } from "@/lib/types";
import { getProjectsSnapshot, subscribeToProjects, updateProject } from "./store";

/**
 * SIMULATED WORKFLOW RUNNER — demo only.
 * Advances processing projects on a timer so the UI can show the full flow:
 * Product clip and presenter run in parallel, the final edit starts when both are done.
 * Stage 8 replaces this with the real orchestrator (server-side, webhooks/polling).
 *
 * Testing hook: a project whose name or product name contains "fail"
 * fails at the presenter step on its first attempt. Retry succeeds.
 */
const DURATION_MS: Record<StepKey, number> = {
  productClip: 7_000,
  presenter: 11_000,
  finalEdit: 8_000,
};

const FAIL_MESSAGE =
  "The presenter video could not be generated. The script was rejected by the voice service. Check the script for unsupported characters and try again.";

function shouldFail(project: Project, step: StepKey) {
  if (step !== "presenter") return false;
  const attempt = project.steps.presenter.attempt ?? 1;
  const haystack = `${project.name} ${project.productName}`.toLowerCase();
  return attempt === 1 && haystack.includes("fail");
}

function tick() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  for (const project of getProjectsSnapshot()) {
    if (project.status !== "processing") continue;

    for (const key of ["productClip", "presenter", "finalEdit"] as const) {
      const step = project.steps[key];
      if (step.status !== "processing") continue;

      // Normalise the start time the first time we see this step running
      // (seed data has old timestamps; a reload restarts the clock).
      const startedAt = step.startedAt ? Date.parse(step.startedAt) : NaN;
      if (Number.isNaN(startedAt) || now - startedAt > DURATION_MS[key] * 3) {
        updateProject(project.id, (p) => ({
          ...p,
          steps: { ...p.steps, [key]: { ...p.steps[key], startedAt: nowIso, attempt: p.steps[key].attempt ?? 1 } },
        }));
        continue;
      }

      if (now - startedAt < DURATION_MS[key]) continue;

      if (shouldFail(project, key)) {
        updateProject(project.id, (p) => ({
          ...p,
          status: "failed",
          steps: {
            ...p.steps,
            [key]: { ...p.steps[key], status: "failed", finishedAt: nowIso, error: FAIL_MESSAGE },
          },
        }));
        continue;
      }

      updateProject(project.id, (p) => {
        const steps = {
          ...p.steps,
          [key]: { ...p.steps[key], status: "completed" as const, finishedAt: nowIso, outputUrl: config.demoVideoUrl },
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

    // The final edit starts only when both inputs are ready.
    const latest = getProjectsSnapshot().find((p) => p.id === project.id);
    if (
      latest &&
      latest.status === "processing" &&
      latest.steps.productClip.status === "completed" &&
      latest.steps.presenter.status === "completed" &&
      latest.steps.finalEdit.status === "waiting"
    ) {
      updateProject(latest.id, (p) => ({
        ...p,
        steps: { ...p.steps, finalEdit: { status: "processing", startedAt: nowIso, attempt: 1 } },
      }));
    }
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

/** Puts a failed step back to processing and resumes the project. */
export function retryStep(projectId: string, key: StepKey) {
  const nowIso = new Date().toISOString();
  updateProject(projectId, (p) => ({
    ...p,
    status: "processing",
    steps: {
      ...p.steps,
      [key]: {
        status: "processing",
        startedAt: nowIso,
        attempt: (p.steps[key].attempt ?? 1) + 1,
      },
    },
  }));
}
