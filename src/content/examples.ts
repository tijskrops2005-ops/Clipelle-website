/**
 * Examples shown on the marketing site. Only our own output, labelled "Sample made with Clipelle".
 * The files are NOT in git (21 October 2026): they live in the public storage bucket "examples"
 * (uploaded with `npm run examples:upload`), and locally in public/examples/ (ignored by git) for
 * work without a network. src/lib/examples.ts resolves each file to a URL; a file that exists in
 * neither place shows a "Sample coming soon" placeholder, so the site never breaks.
 * Tijs adds a file to both places and one entry here. Never footage from other sites.
 */
export type Example = {
  id: string;
  title: string;
  /** Which workflow made it. */
  kind: "ad" | "translate";
  /** File name in the examples bucket and in public/examples/, e.g. "ad-dress-30s-standard.mp4". */
  file: string;
  /** Optional poster image, same places. */
  poster?: string;
  /** One line: length, language, quality. */
  note: string;
};

export const examples: Example[] = [
  {
    id: "dress-standard-30",
    title: "Long-sleeve dress",
    kind: "ad",
    file: "ad-dress-30s-standard.mp4",
    note: "30 s · Dutch · Standard presenter · first real run",
  },
  {
    id: "senvia-nl",
    title: "Product explainer, translated",
    kind: "translate",
    file: "translate-senvia-nl.mp4",
    note: "8 s · English to Dutch · Speed · captions",
  },
];

/** How many tiles the gallery shows; missing entries become placeholders. */
export const GALLERY_SLOTS = 6;
