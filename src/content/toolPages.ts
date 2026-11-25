import { ENHANCE_CREDITS, VIDEO_MAX_SECONDS } from "@/lib/enhanceRules";
import { MEDIA_CREDITS } from "@/lib/mediaTools";

/**
 * One public page per tool (25 Nov 2026, after vmake.ai's tool pages, our own words): what it does, a real
 * before and after when we have made one with the tool (files in the examples bucket; a missing file shows
 * no example, never a stand-in), three steps, the facts, a few questions and the other tools.
 * Every number comes from the same rules the app charges by.
 */
export type ToolPage = {
  slug: string;
  menuTitle: string;
  menuText: string;
  title: string;
  intro: string;
  /** Where "Try it" goes (through sign-in). */
  appHref: string;
  metaTitle: string;
  metaDescription: string;
  /** `ready`: the files are in the examples bucket (made with scripts/make-tool-examples.mts and uploaded); until then no example shows. */
  example?: { media: "video" | "image"; before: string; after: string; beforeLabel?: string; afterLabel?: string; transparent?: boolean; ready?: boolean };
  steps: [string, string, string];
  facts: string[];
  faq: { q: string; a: string }[];
};

export const toolPages: ToolPage[] = [
  {
    slug: "enhance-video",
    menuTitle: "Enhance a video",
    menuText: "Upscale to 1080p or 4K, sharper and cleaner.",
    title: "Make a video sharper, up to 4K",
    intro: "Upload a video and get it back in 1080p or 4K, with less noise and more detail. The sound stays as it was.",
    appHref: "/app/enhance?type=video",
    metaTitle: "Video enhancer: upscale to 1080p or 4K",
    metaDescription: "Upscale a product or social video to 1080p or 4K with less noise and sharper detail. Pay per second in credits.",
    example: { media: "video", before: "translate-senvia-original.mp4", after: "tool-enhance-video-after.mp4", beforeLabel: "Original, 480 × 864", afterLabel: "Enhanced, 1080p", ready: true },
    steps: ["Upload a video (MP4, MOV or WebM)", "Pick 1080p or 4K", "Download the sharper video"],
    facts: [`${ENHANCE_CREDITS.videoPerSecond["1080p"]} credit per second at 1080p, ${ENHANCE_CREDITS.videoPerSecond["4k"]} at 4K`, "Videos above 30 frames per second count double", `Up to ${VIDEO_MAX_SECONDS / 60} minutes and 32 MB; shorter at 4K`, "A failed job gives its credits back"],
    faq: [
      { q: "Does it change the sound?", a: "No. Only the picture is enhanced; the sound stays as it was." },
      { q: "My video is already 1080p. Does it still help?", a: "At 1080p it is cleaned up (less noise, sharper edges) without getting bigger; pick 4K to make it larger." },
      { q: "Can I translate the enhanced video?", a: "Yes. Download it and start a translation, or use “Use in another tool” on the result." },
    ],
  },
  {
    slug: "enhance-image",
    menuTitle: "Enhance an image",
    menuText: "Product photos two or four times bigger.",
    title: "Make a product photo bigger and sharper",
    intro: "Upload a photo and get it back two or four times bigger, sharper and cleaner, with faces kept natural.",
    appHref: "/app/enhance?type=image",
    metaTitle: "Image upscaler for product photos",
    metaDescription: "Upscale a product photo two or four times, sharper and cleaner. Five credits per image.",
    example: { media: "image", before: "tool-enhance-image-before.jpg", after: "tool-enhance-image-after.jpg", beforeLabel: "Original, 480 px", afterLabel: "Enhanced, 2×", ready: true },
    steps: ["Upload a JPG, PNG or WebP", "Pick 2× or 4×", "Download the bigger photo"],
    facts: [`${ENHANCE_CREDITS.image} credits per image`, "Results up to 24 megapixels", "Images up to 10 MB", "A PNG stays a PNG"],
    faq: [
      { q: "Will it invent details?", a: "It sharpens and adds resolution from what is in the photo; it does not add objects or change the product." },
      { q: "Why is 4× sometimes less than 4×?", a: "Results stop at 24 megapixels, so a big photo is enlarged as far as that allows." },
    ],
  },
  {
    slug: "add-captions",
    menuTitle: "Add captions",
    menuText: "Captions of what is said, in your style.",
    title: "Add captions to any video",
    intro: "Upload a video and get it back with captions of what is said, in the language of the video and the style you pick.",
    appHref: "/app/tools/captions",
    metaTitle: "Add captions to a video automatically",
    metaDescription: "Automatic captions for product and social videos, in the spoken language, styled and timed. One credit per two seconds.",
    example: { media: "video", before: "translate-unboxing-original.mp4", after: "tool-captions-after.mp4", beforeLabel: "Original", afterLabel: "With captions", ready: true },
    steps: ["Upload a video", "Pick a caption style and where they sit", "Download the video with captions"],
    facts: ["1 credit per 2 seconds", `At least ${MEDIA_CREDITS.captions.minimum} credits`, "9:16 or the original size", "Five caption styles, the spoken word highlighted"],
    faq: [
      { q: "Which languages?", a: "The captions follow the language that is spoken in the video. To change the language, translate the video instead." },
      { q: "Can I change the text afterwards?", a: "Translated videos have an editor for their captions; for this tool, download the result or run it again with another style." },
    ],
  },
  {
    slug: "remove-text",
    menuTitle: "Remove on-screen text",
    menuText: "Old captions and titles out of a video.",
    title: "Take old captions and titles out of a video",
    intro: "Upload a video with text burned into the picture and get it back clean, with the sound as it was. Ready for new captions or another language.",
    appHref: "/app/tools/remove-text",
    metaTitle: "Remove captions and text from a video",
    metaDescription: "Remove burned-in captions, titles and stickers from a video you own. The sound stays. One credit per second.",
    example: { media: "video", before: "translate-coffee-gift-original.mp4", after: "tool-remove-text-after.mp4", beforeLabel: "With old captions", afterLabel: "Text removed", ready: true },
    steps: ["Upload a video you own", "The text is painted out frame by frame", "Download the clean video"],
    facts: [`${MEDIA_CREDITS["remove-text"].perSecond} credit per second, at least ${MEDIA_CREDITS["remove-text"].minimum}`, "The original sound stays", `Up to ${VIDEO_MAX_SECONDS / 60} minutes and 32 MB`, "For videos you own or may use"],
    faq: [
      { q: "Does it remove watermarks?", a: "No. It is made for your own captions, titles and stickers, not for logos or watermarks of others." },
      { q: "Is the spot always invisible?", a: "Usually; on busy backgrounds a soft trace can stay. New captions on top cover it completely." },
    ],
  },
  {
    slug: "video-to-text",
    menuTitle: "Video to text",
    menuText: "A transcript and subtitles of any video.",
    title: "Turn what is said in a video into text",
    intro: "Upload a video and get everything that is said as a text file and as SRT subtitles, in the language that is spoken.",
    appHref: "/app/tools/transcribe",
    metaTitle: "Video to text: transcript and SRT subtitles",
    metaDescription: "Get a transcript and an SRT subtitle file of any video, in the spoken language. One credit per five seconds.",
    steps: ["Upload a video", "Everything that is said is written out", "Read it, or download the text or the SRT"],
    facts: ["1 credit per 5 seconds", `At least ${MEDIA_CREDITS.transcribe.minimum} credits`, "A text file and an SRT subtitle file", `Up to ${VIDEO_MAX_SECONDS / 60} minutes and 32 MB`],
    faq: [{ q: "Which languages?", a: "The language that is spoken in the video is detected; the text is in that language. To get another language, translate the video." }],
  },
  {
    slug: "clean-voice",
    menuTitle: "Clean up the voice",
    menuText: "Noise, hum and echo out of the speech.",
    title: "Clean up the voice in a video",
    intro: "Upload a video and get it back with the speech clear and the background noise, hum and echo pushed back. The picture stays exactly as it was.",
    appHref: "/app/tools/clean-voice",
    metaTitle: "Remove background noise from a video's speech",
    metaDescription: "Clean up the voice in a product or social video: noise, hum and echo pushed back, picture unchanged. One credit per two seconds.",
    steps: ["Upload a video", "Pick light, normal or strong", "Download the video with clean speech"],
    facts: ["1 credit per 2 seconds", `At least ${MEDIA_CREDITS["clean-voice"].minimum} credits`, "Picture and length unchanged", `Up to ${VIDEO_MAX_SECONDS / 60} minutes and 32 MB`],
    faq: [{ q: "Does it remove music too?", a: "On Strong, mostly yes: it keeps the voice and pushes everything else back. Pick Light or Normal to keep a music bed." }],
  },
  {
    slug: "video-background",
    menuTitle: "Remove video background",
    menuText: "A person or product cut out of a video.",
    title: "Remove the background from a video",
    intro: "Upload a video and get the person or product back on a colour of your choice, or transparent for your editing software.",
    appHref: "/app/tools/video-background",
    metaTitle: "Video background remover",
    metaDescription: "Cut a person or product out of a video: on white, black, green or any colour, or a transparent WebM. Three credits per second, videos up to 1080p.",
    steps: ["Upload a video up to 1080p", "Pick a colour, or transparent", "Download the MP4 (colour) or WebM (transparent)"],
    facts: [`${MEDIA_CREDITS["video-background"].perSecond} credits per second, at least ${MEDIA_CREDITS["video-background"].minimum}`, "Videos up to 1080p", "Transparent as WebM with alpha", "Sound unchanged"],
    faq: [{ q: "Why only up to 1080p?", a: "The work grows with every pixel of every frame; above 1080p it would cost more than the credits cover. Resize or export smaller first." }],
  },
  {
    slug: "resize-video",
    menuTitle: "Resize to 9:16",
    menuText: "Landscape or square to vertical.",
    title: "Turn a video vertical for Reels, TikTok and Shorts",
    intro: "Upload a landscape or square video and get a 1080 × 1920 version: filling the frame, or the whole picture over a blurred copy of itself.",
    appHref: "/app/tools/resize",
    metaTitle: "Resize a video to 9:16",
    metaDescription: "Turn a landscape or square video into a vertical 1080 × 1920 video for Reels, TikTok and Shorts. One credit per two seconds.",
    steps: ["Upload a video", "Fill the frame or keep the whole picture", "Download the vertical video"],
    facts: ["1 credit per 2 seconds", `At least ${MEDIA_CREDITS.resize.minimum} credits`, "Output 1080 × 1920", "Sound unchanged"],
    faq: [{ q: "What happens to the sides?", a: "With “Fill the frame” the sides are cut off; with “Whole picture” everything stays, over a blurred, dimmed copy of the video." }],
  },
  {
    slug: "remove-background",
    menuTitle: "Remove background",
    menuText: "Product photos on a transparent background.",
    title: "Remove the background from a product photo",
    intro: "Upload a photo and get the product back on a transparent background, ready for your shop, a marketplace or an ad.",
    appHref: "/app/tools/remove-background",
    metaTitle: "Remove the background from a product photo",
    metaDescription: "Cut out products and people from a photo, a transparent PNG in seconds. Two credits per image.",
    example: { media: "image", before: "tool-remove-background-before.jpg", after: "tool-remove-background-after.png", beforeLabel: "Original", afterLabel: "Background removed", transparent: true, ready: true },
    steps: ["Upload a JPG, PNG or WebP", "The subject is cut out", "Download a transparent PNG"],
    facts: [`${MEDIA_CREDITS["remove-background"].perImage} credits per image`, "A transparent PNG", "Images up to 10 MB", "Made on a model trained on licensed images"],
    faq: [{ q: "Does it work on people too?", a: "Yes: products, people and products held by people are cut out alike." }],
  },
];

export const toolPageBySlug = (slug: string) => toolPages.find((p) => p.slug === slug);
