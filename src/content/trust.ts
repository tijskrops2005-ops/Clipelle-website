/**
 * Trust content for the marketing site: logos, reviews, numbers, press. ONE rule: everything here
 * must be real and approved by Tijs. While a list is empty, its block is not rendered anywhere;
 * NEXT_PUBLIC_TRUST_PREVIEW=true shows the labelled example layout (src/content/trust.example.ts)
 * for judging the design.
 *
 * Facts that are true today and may always be shown live in `facts` below.
 */
export type TrustLogo = { name: string; /** Path under /public, e.g. "/trust/acme.svg". */ src: string; href?: string };
export type TrustReview = { name: string; role: string; text: string; /** 1–5 */ stars: number; avatar?: string };
export type TrustNumber = { value: string; label: string };
export type TrustPress = { name: string; src: string; href?: string };

export type TrustContent = {
  logos: TrustLogo[];
  reviews: TrustReview[];
  numbers: TrustNumber[];
  press: TrustPress[];
};

export const trust: TrustContent = {
  logos: [],
  reviews: [],
  numbers: [],
  press: [],
};

/** Product facts that hold today (from docs/roadmap.md and CLAUDE.md); shown on every build. */
export const facts: { title: string; text: string }[] = [
  { title: "Costs shown before you start", text: "Every form shows an estimate for your choices. Nothing starts until you confirm it." },
  { title: "Real amounts afterwards", text: "The project page shows what a video really cost, next to the estimate." },
  { title: "Rights confirmed for translations", text: "A video is only translated after you confirm you own it and have the speaker's permission." },
  { title: "Your files stay in our storage", text: "Uploads and finished videos are kept in a private bucket; links expire and are signed per request." },
];

export function hasTrustContent(t: TrustContent = trust) {
  return t.logos.length > 0 || t.reviews.length > 0 || t.numbers.length > 0 || t.press.length > 0;
}
