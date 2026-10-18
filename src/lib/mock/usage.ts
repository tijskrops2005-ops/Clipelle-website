/** MOCK — demo usage numbers for the dashboard card. Replaced by real counts in Stage 8. */
export const mockUsage = {
  videosThisMonth: 4,
  monthlyLimit: 20,
  minutesSaved: 95, // rough: ~24 minutes of manual work per video, simulated
} as const;

/**
 * MOCK — inspiration row. These are placeholders, not real videos:
 * each entry is a label plus a tint so the tiles read as "example formats".
 */
export type InspirationExample = {
  id: string;
  title: string;
  format: string;
  tint: "warm" | "cool" | "sand" | "mint" | "rose" | "slate";
};

export const mockInspiration: InspirationExample[] = [
  { id: "ex_1", title: "Unboxing", format: "Product reveal", tint: "warm" },
  { id: "ex_2", title: "Testimonial", format: "Presenter to camera", tint: "cool" },
  { id: "ex_3", title: "Before & after", format: "Split result", tint: "sand" },
  { id: "ex_4", title: "Problem → fix", format: "Hook then demo", tint: "mint" },
  { id: "ex_5", title: "Three reasons", format: "Quick list", tint: "rose" },
  { id: "ex_6", title: "Founder note", format: "Short story", tint: "slate" },
];
