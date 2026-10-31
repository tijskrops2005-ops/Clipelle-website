import { describe, expect, it } from "vitest";
import { projectNameFromFile } from "./projectName";

describe("projectNameFromFile", () => {
  it("turns a file name into a readable project name", () => {
    expect(projectNameFromFile("founder-story_v2.MP4")).toBe("Founder story v2");
    expect(projectNameFromFile("IMG_4821.mov")).toBe("IMG 4821");
    expect(projectNameFromFile("productDemo.webm")).toBe("Product Demo");
    expect(projectNameFromFile("  spaced   name .mp4")).toBe("Spaced name");
  });

  it("falls back when nothing readable is left and caps the length", () => {
    expect(projectNameFromFile(".mp4")).toBe("Translation");
    expect(projectNameFromFile("a.mp4")).toBe("Translation");
    expect(projectNameFromFile(`${"x".repeat(80)}.mp4`)).toHaveLength(60);
  });
});
