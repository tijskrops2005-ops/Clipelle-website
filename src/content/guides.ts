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
  {
    slug: "your-first-ad-step-by-step",
    title: "Your first ad, step by step",
    summary: "From a photo and two sentences to a finished 9:16 ad, with what to expect at every step and what it costs.",
    minutes: 5,
    sections: [
      { heading: "1. Pick a starting point", paragraphs: ["Studio offers three starts. Image to video: upload one or more product photos and type the facts. URL to video: paste the link of your product page; the name, description and photos are read from it for you to check. Translate: a video you already have, in other languages. For a first ad, Image to video with one clear photo is the simplest."] },
      { heading: "2. Fill in the product block", paragraphs: ["Product name, two or three factual sentences, and the length. The length chips show the price per length in dollars and credits; 30 seconds is preselected. Under Advanced you can add the product link, an Offer (the only way a deal gets into the call to action) and a Direction (who the ad is for, what to emphasise)."] },
      { heading: "3. Presenter and voice", paragraphs: ["Standard is preselected and recommended; Premium moves more naturally and costs more per second. Pick a presenter from the portrait looks, then the language, accent and voice; the presenter's own voice is preselected when it fits. Speed changes the pace, not the word limit."] },
      { heading: "4. Script and style", paragraphs: ["Leave the script empty and one is written for you, or paste your own. Tick \"Review script first\" to read it before anything is paid: you pick one of three hooks and edit the words within the limit for your length. Brand style is optional: an accent colour that highlights the spoken caption word, a caption look, a font and a logo."] },
      { heading: "5. The summary and the button", paragraphs: ["The fixed summary repeats your choices and the estimate in credits and dollars. The button shows the same number. After a click you see one confirmation with length, quality and the amount; only then does anything start."] },
      { heading: "6. Follow the steps on the project page", paragraphs: ["Script, product clip, presenter and final edit each show Waiting, Processing, Completed or Failed. The product clip and the presenter run at the same time; the final edit starts when both are done. You can leave the page; the finished video lands on your dashboard. A failed step shows a plain-language reason and a Retry button that resumes at that step."] },
      { heading: "7. The result", paragraphs: ["The video is the first thing on the project page, with length, format, language, quality, time to ready and the real amount spent next to the estimate. Download it, or click Make another with the same choices."] },
    ],
  },
  {
    slug: "translating-a-video-you-own",
    title: "Translating a video you own, step by step",
    summary: "What to upload, how to pick languages and quality, what the automatic check does, and what you get back.",
    minutes: 5,
    sections: [
      { heading: "Before you start: the rights", paragraphs: ["Only videos you own, with the speaker's permission to use their voice and face. The form has a checkbox with exactly that sentence; without it the button stays disabled and the server refuses the request. The confirmation is stored with the project."] },
      { heading: "1. Upload", paragraphs: ["MP4, WebM or QuickTime, up to 32 MB and three minutes. The limit is explained before you pick a file. A preview plays in the form so you can check it is the right cut."] },
      { heading: "2. Spoken language and targets", paragraphs: ["Leave \"Detect automatically\" on unless the detection has been wrong for this speaker before. Then pick one or more of the 190 target languages and regional variants; the most used ones are at the top and the list is searchable. A target equal to the source is refused."] },
      { heading: "3. Speed or Precision", paragraphs: ["Speed is the standard lip-sync and the recommended choice for most videos. Precision redraws the mouth for close-ups, takes longer and costs more. The estimate updates live per language."] },
      { heading: "4. The options", paragraphs: ["Terms to keep: brand names and product names the translation must leave as they are. Format: 9:16 for TikTok, Reels and Shorts, or the original size. Remove silence at the start and end (on by default). Caption position Low or Middle. Picture enhancement for soft footage."] },
      { heading: "5. What happens after you click", paragraphs: ["Upload → Translate → Captions and 9:16. In the translate step every line is compared with the original by an automatic check: missing or added words, meaning, numbers, names and natural phrasing are corrected within the timing. The changes and warnings are shown on the project page per language. Language versions render in parallel; one failing version does not stop the others."] },
      { heading: "6. The result", paragraphs: ["One video per language, each with its own captions, download button and the amount spent. Check a few lines against the warnings the quality check raised, especially numbers and names."] },
    ],
  },
  {
    slug: "brand-style-colour-captions-font-logo",
    title: "Brand style: colour, captions, font, logo",
    summary: "The four brand choices, what each one changes in the video, and how to save them as defaults.",
    minutes: 3,
    sections: [
      { heading: "What brand style can and cannot do", paragraphs: ["Captions are the only text on screen, so brand style is about those captions and a small logo. There are no text cards, no end cards and no buttons to style. That keeps every ad consistent and keeps you from adding things the format does not need."] },
      { heading: "Accent colour", paragraphs: ["Your colour highlights the word that is being spoken. Pick a swatch or type a hex value. White text sits on that colour, so the form warns when the contrast is below 3:1; a darker shade fixes it."] },
      { heading: "Caption look and font", paragraphs: ["The caption look sets the size, weight and pop of the captions; the font is one of the built-in fonts of the edit. Choose for readability on a phone first: short lines, large letters, high contrast."] },
      { heading: "Logo", paragraphs: ["A PNG with a transparent background works best; JPG and plain SVG also work, up to 2 MB. It sits small, top right, for the whole video. You can also leave it out."] },
      { heading: "Save defaults", paragraphs: ["Settings → Brand stores colour, caption look, font and logo as the starting values of every new ad form. The form still sends exactly what you leave in it, so you can change any of them per video."] },
    ],
  },
];

export function guideBySlug(slug: string) {
  return guides.find((g) => g.slug === slug);
}
