import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({}));
vi.mock("@/lib/storage", () => ({}));
vi.mock("@/lib/services/costGuard", () => ({}));
vi.mock("@/lib/services/textLocate", () => ({ EXTRACT_FRAME_USD: 0.002, extractFrame: vi.fn() }));

describe("mail poster", () => {
  it("turns a 9:16 frame into a small rounded JPEG with a play button", async () => {
    const { drawPoster, MAIL_POSTER_WIDTH } = await import("./mailPoster");
    const frame = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#3366AA" } }).png().toBuffer();
    const poster = await drawPoster(frame);
    expect(poster.width).toBe(MAIL_POSTER_WIDTH);
    expect(poster.height).toBe(853);
    expect(poster.jpeg.subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(poster.jpeg.length).toBeLessThan(120_000);
    const { data, info } = await sharp(poster.jpeg).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    expect(at(1, 1)).toBeGreaterThan(240); // corner: the card's white
    expect(at(info.width / 2 - 40, Math.floor(info.height / 2))).toBeGreaterThan(220); // the play circle
  });
});
