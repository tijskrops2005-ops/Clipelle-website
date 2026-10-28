import { describe, expect, it } from "vitest";
import { evenPaceTargets, paceSpread } from "./evenPace";

describe("even speaking pace", () => {
  // The run of 28 Oct 2026: 75 characters in 3.5 s, then 170 in 9.2 s.
  const run = [
    { index: 1, start: 0.14, end: 3.6, text: "Mijn moeder is stiekem boos op me omdat ik papa de clipelle ritual set gaf." },
    { index: 2, start: 3.8, end: 12.98, text: "Ik gaf mijn vader de clipelle ritual set, en nu kijkt mijn moeder me scheef aan: zijn opgeblazen gevoel verdween veel sneller dan verwacht, en andere vrouwen merkten het ook op." },
  ];

  it("gives every line the length of one shared pace", () => {
    const [a, b] = evenPaceTargets(run);
    expect(a.current).toBeGreaterThan(a.target); // the first line is the rushed one
    expect(b.current).toBeLessThanOrEqual(b.target + 1);
    expect(a.target / a.seconds).toBeCloseTo(b.target / b.seconds, 0);
  });

  it("measures how uneven the pace is", () => {
    expect(paceSpread(run)).toBeGreaterThan(1.1);
    expect(paceSpread([{ start: 0, end: 2, text: "abcdefghij" }, { start: 2, end: 4, text: "abcdefghij" }])).toBe(1);
  });
});
