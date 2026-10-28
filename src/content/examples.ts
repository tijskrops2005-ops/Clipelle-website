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
  // Translations first (28 Oct 2026, translation-first site): Tijs's own videos, translated with Clipelle.
  {
    id: "unboxing-nl",
    title: "Unboxing, translated",
    kind: "translate",
    file: "translate-unboxing-nl.mp4",
    poster: "translate-unboxing-nl.jpg",
    note: "8 s · into Dutch · own voice, lip sync, captions",
  },
  {
    id: "coffee-gift-nl",
    title: "Gift story, translated",
    kind: "translate",
    file: "translate-coffee-gift-nl.mp4",
    poster: "translate-coffee-gift-nl.jpg",
    note: "11 s · into Dutch · own voice, lip sync, captions",
  },
  {
    id: "lounge-chair-nl",
    title: "Product review, translated",
    kind: "translate",
    file: "translate-lounge-chair-nl.mp4",
    poster: "translate-lounge-chair-nl.jpg",
    note: "30 s · into Dutch · own voice, lip sync, captions",
  },
  {
    id: "senvia-nl",
    title: "Product explainer, translated",
    kind: "translate",
    file: "translate-senvia-nl.mp4",
    poster: "translate-senvia-nl.jpg",
    note: "8 s · English to Dutch · Speed · captions",
  },
  {
    id: "dress-standard-30",
    title: "Long-sleeve dress",
    kind: "ad",
    file: "ad-dress-30s-standard.mp4",
    poster: "ad-dress-30s-standard.jpg",
    note: "30 s · Dutch · Standard presenter · first real run",
  },
];

/** How many tiles the gallery shows; missing entries become placeholders. */
export const GALLERY_SLOTS = 6;
