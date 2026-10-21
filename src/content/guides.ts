export type Guide = { slug: string; title: string; summary: string; minutes: number; sections: { heading: string; paragraphs: string[] }[] };

/** Three guides in our own words. Each is a page under /resources/guides/[slug]. */
export const guides: Guide[] = [
  {
    slug: "product-description-that-makes-a-good-script",
    title: "A product description that makes a good script",
    summary: "The script is written from your description. Three sentences with the right facts beat a long marketing text.",
    minutes: 3,
    sections: [
      { heading: "Say what it is, who it is for and why it is better", paragraphs: ["Start with the plain product: a vitamin C serum, a 750 ml insulated bottle, a long-sleeve dress. Then the person it is for. Then the one thing that makes it better than the obvious alternative. The script follows that order: hook, benefits, call to action, all spoken by the presenter."] },
      { heading: "Give facts, not adjectives", paragraphs: ["\"Keeps drinks cold for 24 hours\" is a line a presenter can say. \"Premium quality\" is not. Numbers, materials, times and sizes make a script concrete; the presenter has about 2.5 words per second, so every word must earn its place.", "Leave out shipping, returns and shop policies. They are not part of a spoken ad and the script ignores them."] },
      { heading: "Use the Offer and Direction fields for the rest", paragraphs: ["A discount, bundle or free shipping goes in the Offer field, so the call to action can mention it. Who the ad is for and what to emphasise goes in Direction. The script treats both as information, never as instructions."] },
      { heading: "Review before anything is paid", paragraphs: ["Tick \"Review script first\" and the video pauses after the script. You pick one of three hooks, adjust the words within the limit for your length, and approve. Only then are the presenter and the product clip made."] },
    ],
  },
  {
    slug: "standard-or-premium-presenter",
    title: "Standard or Premium presenter?",
    summary: "What the two qualities change, what they cost, and when the cheaper one is the better choice.",
    minutes: 2,
    sections: [
      { heading: "What changes", paragraphs: ["Both qualities use the same presenter, voice and script. Premium moves the head and hands more naturally and has the best lip-sync. Standard is a little stiffer, which is barely visible when the presenter is small on screen or when the product footage is in view."] },
      { heading: "What it costs", paragraphs: ["Premium costs more per second of video, so the difference grows with the length. The quality cards on the form show the price for the whole video at your chosen length, and the summary shows what Premium adds on top of Standard."] },
      { heading: "Our recommendation", paragraphs: ["Start with Standard. It is preselected, every length fits the included credits, and the first real run was made with it. Switch to Premium for a hero ad where the presenter fills the frame for most of the video."] },
    ],
  },
  {
    slug: "translating-a-video-rights-languages-check",
    title: "Translating a video: rights, languages and the automatic check",
    summary: "What happens between uploading a video you own and downloading it in another language.",
    minutes: 4,
    sections: [
      { heading: "You confirm the rights first", paragraphs: ["The voice and face in your video are cloned for the translation. Before anything starts you tick that you own the video and have the speaker's permission. The confirmation is stored with the project, with a timestamp."] },
      { heading: "Pick languages and a quality", paragraphs: ["You can choose several target languages at once, including regional variants that change the accent and spelling. Speed is the recommended quality: fast, affordable, good for one person talking to the camera. Precision re-renders the mouth and is better for faces that move or side angles; it takes about twice as long."] },
      { heading: "Every line is checked automatically", paragraphs: ["The translated lines are compared with the original for missing words, numbers, names and natural phrasing, and corrected within the timing of each line. The corrections and any warnings are shown on the project page. Nothing waits for you."] },
      { heading: "Captions and format", paragraphs: ["Captions of what is said are the only thing added to the picture. You choose vertical 9:16 for TikTok, Reels and Shorts, or keep the original size. Silence at the start and end can be removed; the speech and the lip-sync stay untouched."] },
    ],
  },
];

export function guideBySlug(slug: string) {
  return guides.find((g) => g.slug === slug);
}
