import { describe, expect, it } from "vitest";
import { dataClock, expectedSeconds, runningLabel, translateProgress, type ProgressInput } from "./translateProgress";

const T0 = Date.parse("2026-10-27T10:00:00Z");
const iso = (offsetSec: number) => new Date(T0 + offsetSec * 1000).toISOString();

function project(over: Partial<ProgressInput> = {}): ProgressInput {
  return {
    status: "processing",
    createdAt: iso(0),
    steps: { upload: { status: "processing", startedAt: iso(0) }, translate: { status: "waiting" }, captions: { status: "waiting" } },
    translations: [{ language: "nl", status: "waiting" }],
    targetLanguages: ["nl"],
    sourceSeconds: 8,
    ...over,
  };
}

describe("translateProgress", () => {
  it("rises with time inside a stage and never reaches 100 on its own", () => {
    const p = project();
    const a = translateProgress(p, T0 + 1000).percent;
    const b = translateProgress(p, T0 + 8000).percent;
    const c = translateProgress(p, T0 + 600_000).percent;
    expect(a).toBeGreaterThanOrEqual(1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(100);
  });

  it("is 100 when completed and keeps the expected order of stages", () => {
    const done = project({ status: "completed", steps: { upload: { status: "completed", startedAt: iso(0), finishedAt: iso(10) }, translate: { status: "completed", startedAt: iso(10), finishedAt: iso(60) }, captions: { status: "completed", startedAt: iso(60), finishedAt: iso(250) } }, translations: [{ language: "nl", status: "completed" }] });
    const r = translateProgress(done, T0 + 300_000);
    expect(r.percent).toBe(100);
    expect(r.minutesLeft).toBe(0);
    expect(r.stages.map((s) => s.key)).toEqual(["upload", "translate", "voice", "captions"]);
    expect(r.stages.every((s) => s.state === "done")).toBe(true);
    expect(r.languages[0]).toMatchObject({ state: "ready", percent: 100 });
  });

  it("adds the text-removal and enhancement stages only when chosen", () => {
    const r = translateProgress(project({ removeText: true, enhance: true }), T0 + 1000);
    expect(r.stages.map((s) => s.key)).toEqual(["removeText", "upload", "translate", "voice", "enhance", "captions"]);
    expect(r.stages[0].state).toBe("active");
    expect(r.stages[1].state).toBe("todo");
  });

  it("follows the phase of every language after the translation and reports the slowest as minutes left", () => {
    const p = project({
      steps: { upload: { status: "completed", startedAt: iso(0), finishedAt: iso(10) }, translate: { status: "completed", startedAt: iso(10), finishedAt: iso(60) }, captions: { status: "processing", startedAt: iso(60) } },
      targetLanguages: ["nl", "de"],
      translations: [
        { language: "nl", status: "completed" },
        { language: "de", status: "processing", phase: { key: "captions", at: iso(200) } },
      ],
    });
    const r = translateProgress(p, T0 + 210_000);
    expect(r.languages.find((l) => l.code === "nl")).toMatchObject({ state: "ready", percent: 100 });
    const de = r.languages.find((l) => l.code === "de")!;
    expect(de.state).toBe("active");
    expect(de.label).toBe("Adding captions");
    expect(de.percent).toBeGreaterThan(50);
    expect(r.stages.find((s) => s.key === "voice")?.state).toBe("done");
    expect(r.stages.find((s) => s.key === "captions")?.state).toBe("active");
    expect(r.current).toBe("Adding captions");
    expect(r.minutesLeft).toBe(1);
    expect(r.percent).toBeGreaterThan(80);
    expect(r.percent).toBeLessThan(100);
  });

  it("says a stage is overdue instead of guessing minutes when it runs far past its expectation", () => {
    const expected = expectedSeconds("upload", 8);
    const r = translateProgress(project(), T0 + expected * 2 * 1000);
    expect(r.overdue).toBe(true);
    expect(r.minutesLeft).toBeNull();
    expect(r.percent).toBeLessThan(100);
  });

  it("marks the running stage failed when the project failed and uses presenter wording", () => {
    const r = translateProgress(project({ status: "failed", speaker: "presenter", steps: { upload: { status: "completed", startedAt: iso(0), finishedAt: iso(10) }, translate: { status: "failed", startedAt: iso(10), error: "The audio was too quiet." }, captions: { status: "waiting" } } }), T0 + 100_000);
    expect(r.stages.find((s) => s.key === "translate")?.state).toBe("failed");
    expect(r.stages.find((s) => s.key === "voice")?.label).toBe("Recording the presenter");
    expect(r.current).toBe("Stopped");
  });

  it("scales the expectation with the source length", () => {
    expect(expectedSeconds("voice", 60)).toBeGreaterThan(expectedSeconds("voice", 8));
  });

  it("says how long the work runs in minutes, never hours", () => {
    expect(runningLabel(30_000)).toBe("Just started");
    expect(runningLabel(3 * 60_000 + 5_000)).toBe("Running 3 min");
    expect(runningLabel(90 * 60_000)).toBe("Running over an hour");
  });

  it("gives every language chip the word for its own stage and the project its start time", () => {
    const p = project({
      steps: { upload: { status: "completed", startedAt: iso(0), finishedAt: iso(20) }, translate: { status: "completed", startedAt: iso(20), finishedAt: iso(90) }, captions: { status: "processing", startedAt: iso(90) } },
      translations: [{ language: "nl", status: "completed" }, { language: "de", status: "processing", phase: { key: "captions", at: iso(200) } }, { language: "fr", status: "processing", phase: { key: "voice", at: iso(100) } }],
      targetLanguages: ["nl", "de", "fr"],
    });
    const g = translateProgress(p, T0 + 210_000);
    expect(g.languages.map((l) => l.short)).toEqual(["ready", "captions", "voice"]);
    expect(g.startedAt).toBe(T0);
    // Before the translation is done, every chip shares the stage the whole project is in.
    expect(translateProgress(project(), T0 + 5_000).languages[0].short).toBe("upload");
    expect(translateProgress(project({ speaker: "presenter", steps: { upload: { status: "completed", startedAt: iso(0) }, translate: { status: "completed", startedAt: iso(1) }, captions: { status: "processing", startedAt: iso(2) } } }), T0 + 5_000).languages[0].short).toBe("presenter");
  });

  it("dataClock is the newest time in the data, so server and browser agree before hydration", () => {
    const p = project({
      steps: { upload: { status: "completed", startedAt: iso(0), finishedAt: iso(20) }, translate: { status: "completed", startedAt: iso(20), finishedAt: iso(90) }, captions: { status: "processing", startedAt: iso(90) } },
      translations: [{ language: "nl", status: "processing", phase: { key: "voice", at: iso(100) } }],
    });
    expect(dataClock(p)).toBe(T0 + 100_000);
    expect(dataClock(project({ steps: { upload: { status: "waiting" }, translate: { status: "waiting" }, captions: { status: "waiting" } } }))).toBe(T0);
    // Read with its own clock, a running stage has just started: the same number on both sides.
    expect(translateProgress(p, dataClock(p)).percent).toBe(translateProgress(p, dataClock(p)).percent);
  });
});
