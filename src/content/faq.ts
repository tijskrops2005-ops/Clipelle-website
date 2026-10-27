import { config } from "@/lib/config";

export type FaqItem = { q: string; a: string };

/**
 * One entry as written: `adsOnly` questions show only while ads are on (config.features.ads, 27 Oct
 * 2026) and `translateOnly` is the answer without ads. The Dutch versions sit in faqI18n.ts, keyed by
 * the English question.
 */
type FaqSource = FaqItem & { adsOnly?: boolean; translateOnly?: string };

const SOURCE: FaqSource[] = [
  { q: "What do I need to start?", a: "For a translation: a video you own with one clear speaker. You pick the languages; the speaker keeps their own voice and the lips follow. For a new ad: one product photo and two or three sentences about the product.", translateOnly: "A video you own with one clear speaker, up to 32 MB and three minutes. You pick the languages; the speaker keeps their own voice and the lips follow." },
  { q: "Which videos can I translate?", a: "Videos you own, up to 32 MB and three minutes, with the speaker's permission to use their voice and face. You confirm this before every translation." },
  { q: "How long does it take?", a: "In our own measured runs a short translation was ready in about 4.5 minutes and a 30-second ad in about 6. Longer videos take longer. You can leave the page; the finished video lands on your dashboard.", translateOnly: "In our own measured runs a short translation was ready in about 4.5 minutes. Longer videos and more languages take longer. You can leave the page; we e-mail you when it is ready." },
  { q: "What is a credit?", a: "One credit is one second of translated video in Speed quality, per language. Precision uses 2 per second, an ad 2 per second (at least 30) and a Premium ad 6. A short translation uses at least 10 credits per language.", translateOnly: "One credit is one second of translated video in Speed quality, per language. Precision uses 2 per second and picture enhancement adds 1. A short translation uses at least 10 credits per language." },
  { q: "What does a video cost?", a: "Credits, by length. A minute of translation in Speed uses 60 credits per language; a 30-second ad uses 60. Every form shows the credits before you start, and a video that fails costs nothing.", translateOnly: "Credits, by length. A minute of translation in Speed uses 60 credits per language, in Precision 120. The form shows the credits before you start, and a language version that fails costs nothing." },
  { q: "What is placed on screen?", a: "Only captions of what is said, in the caption style you choose, plus your logo on an ad if you add one. No text cards, no buttons, no end cards.", translateOnly: "Only captions of what is said, in the caption style you choose. No text cards, no buttons, no end cards." },
  { q: "Can I use my own script?", a: "Yes. Paste it in the script field, or tick \"Review script first\" to read and approve the written script before anything else starts.", adsOnly: true },
  { q: "Can I use a product page link instead of uploading photos?", a: "Yes. URL to video reads the name, description and photos from a public product page. You check and edit them, tick the photos you own, and the normal ad form opens prefilled.", adsOnly: true },
  { q: "Is there an API?", a: "Yes. On a plan with credits you can create keys in Settings → API keys and create ads and translations from your own code, with the same credits and limits as the form. There is also an MCP server for AI assistants.", translateOnly: "Yes. On a plan with credits you can create keys in Settings → API keys and translate videos from your own code, with the same credits and limits as the form. There is also an MCP server for AI assistants." },
  { q: "Which languages are supported?", a: "Translations support 190 languages and regional variants. An ad, or a translation spoken by an AI presenter, works in the languages that have presenter voices, listed on the form.", translateOnly: "190 languages and regional variants. Translating with an AI presenter works in the languages that have presenter voices, listed on the form." },
  { q: "Who owns the videos?", a: "You do. Clipelle makes them for you from your product and your inputs; use them wherever you like. For translations you confirm first that you own the source video and have the speaker's permission.", translateOnly: "You do. Clipelle makes them from your video and your choices; use them wherever you like. You confirm first that you own the source video and have the speaker's permission." },
  { q: "Do unused credits carry over?", a: "Yes. Credits never expire: credits from a subscription or a credit pack stay in your workspace, also after you cancel a subscription. Deleting your account forfeits them. The 30 free credits are the one exception: they expire 30 days after they are granted." },
  { q: "Can I cancel?", a: "Yes, any time from Billing. Your plan stays active until the end of the period you paid for." },
  { q: "Where are my files stored?", a: "In our private storage. Links to your videos are signed per request and expire; nothing is public unless you share the file yourself." },
  { q: "Can I delete my data?", a: "Deleting a project removes its files. Deleting your account in Settings removes your projects, files, credits and profile; it cannot be undone." },
];

/** Questions used on the homepage, the pricing page and /resources/faq. Own words, true today. Translation first; the homepage shows the first six. */
export const faq: FaqItem[] = SOURCE.filter((f) => config.features.ads || !f.adsOnly).map(({ q, a, translateOnly }) => ({ q, a: !config.features.ads && translateOnly ? translateOnly : a }));
