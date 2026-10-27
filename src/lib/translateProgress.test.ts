import { describe, expect, it } from "vitest";
import { expectedSeconds, translateProgress, type ProgressInput } from "./translateProgress";

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
});
