import { describe, expect, it } from "vitest";
import { clearDraft, clearDrafts, DRAFT_MAX_AGE_MS, draftKey, memoryStore, readDraft, writeDraft } from "./formDraft";

const alice = { userId: "u-alice", workspaceId: "w-1" };
const aliceTeam = { userId: "u-alice", workspaceId: "w-team" };
const bob = { userId: "u-bob", workspaceId: "w-1" };

describe("form drafts", () => {
  it("saves and restores a draft for the same form, user and workspace", () => {
    const store = memoryStore();
    writeDraft("translate", alice, { targets: ["nl", "de"], name: "Launch" }, store, 1000);
    const back = readDraft<{ targets: string[]; name: string }>("translate", alice, store, 2000);
    expect(back?.data).toEqual({ targets: ["nl", "de"], name: "Launch" });
    expect(back?.savedAt).toBe(new Date(1000).toISOString());
  });

  it("keeps users, workspaces and forms apart", () => {
    const store = memoryStore();
    writeDraft("translate", alice, { name: "mine" }, store);
    expect(readDraft("translate", bob, store)).toBeNull();
    expect(readDraft("translate", aliceTeam, store)).toBeNull();
    expect(readDraft("ad", alice, store)).toBeNull();
    expect(draftKey("translate", alice)).not.toBe(draftKey("translate", aliceTeam));
  });

  it("clears one form, or every form of this user in this workspace, and nothing else", () => {
    const store = memoryStore();
    writeDraft("translate", alice, { a: 1 }, store);
    writeDraft("ad", alice, { b: 2 }, store);
    writeDraft("translate", aliceTeam, { c: 3 }, store);
    writeDraft("translate", bob, { d: 4 }, store);
    clearDraft("ad", alice, store);
    expect(readDraft("ad", alice, store)).toBeNull();
    expect(readDraft("translate", alice, store)).not.toBeNull();
    clearDrafts(alice, store);
    expect(readDraft("translate", alice, store)).toBeNull();
    expect(readDraft("translate", aliceTeam, store)?.data).toEqual({ c: 3 });
    expect(readDraft("translate", bob, store)?.data).toEqual({ d: 4 });
  });

  it("forgets a stale draft and ignores unreadable data", () => {
    const store = memoryStore();
    writeDraft("translate", alice, { a: 1 }, store, 0);
    expect(readDraft("translate", alice, store, DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(store.length).toBe(0);
    store.setItem(draftKey("translate", alice), "{not json");
    expect(readDraft("translate", alice, store)).toBeNull();
    store.setItem(draftKey("translate", alice), JSON.stringify({ data: { a: 1 } }));
    expect(readDraft("translate", alice, store)).toBeNull();
  });

  it("works without a store (server rendering, blocked storage)", () => {
    expect(() => writeDraft("translate", alice, { a: 1 }, null)).not.toThrow();
    expect(readDraft("translate", alice, null)).toBeNull();
    expect(() => clearDrafts(alice, null)).not.toThrow();
  });
});
