/**
 * Examples shown on the marketing site. Only our own output, labelled "Sample made with Reelay".
 * Tijs adds a file under public/examples/ and one entry here. Never footage from other sites.
 * An empty list (or a missing file) shows "Sample coming soon" placeholders instead.
 */
export type Example = {
  id: string;
  title: string;
  /** Which workflow made it. */
  kind: "ad" | "translate";
  /** Path under /public, e.g. "/examples/ad-dress-30s-standard.mp4". */
  src: string;
  /** Optional poster image under /public. */
  poster?: string;
  /** One line: length, language, quality. */
  note: string;
};

export const examples: Example[] = [
  {
    id: "dress-standard-30",
    title: "Long-sleeve dress",
    kind: "ad",
    src: "/examples/ad-dress-30s-standard.mp4",
    note: "30 s · Dutch · Standard presenter · first real run",
  },
  {
    id: "senvia-nl",
    title: "Product explainer, translated",
    kind: "translate",
    src: "/examples/translate-senvia-nl.mp4",
    note: "8 s · English to Dutch · Speed · captions",
  },
];

/** How many tiles the gallery shows; missing entries become placeholders. */
export const GALLERY_SLOTS = 6;
