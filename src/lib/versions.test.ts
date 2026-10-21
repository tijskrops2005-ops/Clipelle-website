import { describe, expect, it } from "vitest";
import type { AdProject, Project, TranslateProject } from "@/lib/types";
import { nextVersionNumber, otherVersionsOf, rootIdOf, sourceAdOf, translationsOf, versionName } from "./versions";

const steps = { script: { status: "completed" as const }, productClip: { status: "completed" as const }, presenter: { status: "completed" as const }, finalEdit: { status: "completed" as const } };
const ad = (id: string, extra: Partial<AdProject> = {}): AdProject => ({ id, workflow: "ad", name: `Ad ${id}`, productName: "P", description: "d", imageUrls: [], status: "completed", steps, createdAt: "2026-10-21T00:00:00Z", ...extra });
const tr = (id: string, parentId?: string): TranslateProject => ({ id, workflow: "translate", name: `T ${id}`, status: "completed", createdAt: "2026-10-21T00:00:00Z", sourceFileName: "a.mp4", sourceSeconds: 30, sourceLanguage: "en", targetLanguages: ["nl"], quality: "speed", rightsConfirmedAt: "2026-10-21T00:00:00Z", steps: { upload: { status: "completed" }, translate: { status: "completed" }, captions: { status: "completed" } }, translations: [], parentId });

const root = ad("root");
const v2 = ad("v2", { parentId: "root", version: 2 });
const v3 = ad("v3", { parentId: "root", version: 3 });
const other = ad("other");
const all: Project[] = [v3, tr("t1", "root"), v2, other, tr("t2", "other"), root];

describe("versions", () => {
  it("finds the root from any version", () => {
    expect(rootIdOf(root)).toBe("root");
    expect(rootIdOf(v3)).toBe("root");
    expect(rootIdOf(tr("t1", "root"))).toBe("t1");
  });
  it("lists the other versions of a group in version order, never other groups", () => {
    expect(otherVersionsOf(all, root).map((p) => p.id)).toEqual(["v2", "v3"]);
    expect(otherVersionsOf(all, v3).map((p) => p.id)).toEqual(["root", "v2"]);
    expect(otherVersionsOf(all, other)).toEqual([]);
  });
  it("numbers the next version after the highest one in the group", () => {
    expect(nextVersionNumber(all, root)).toBe(4);
    expect(nextVersionNumber(all, v2)).toBe(4);
    expect(nextVersionNumber(all, other)).toBe(2);
  });
  it("names a version without stacking prefixes", () => {
    expect(versionName("Glow launch", 2)).toBe("Version 2 of Glow launch");
    expect(versionName("Version 2 of Glow launch", 3)).toBe("Version 3 of Glow launch");
  });
  it("groups translations under the ad they were made from", () => {
    expect(translationsOf(all, "root").map((p) => p.id)).toEqual(["t1"]);
    expect(translationsOf(all, "v2")).toEqual([]);
    expect(sourceAdOf(all, tr("t2", "other"))?.id).toBe("other");
    expect(sourceAdOf(all, tr("t3"))).toBeUndefined();
  });
});
