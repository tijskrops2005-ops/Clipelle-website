export type FaqItem = { q: string; a: string };

/** Questions used on the homepage, the pricing page and /resources/faq. Own words, true today. */
export const faq: FaqItem[] = [
  { q: "What do I need to start?", a: "One product photo and two or three sentences about the product. The script, the presenter and the edit are made for you. For a translation you upload a video you own." },
  { q: "Can I use my own script?", a: "Yes. Paste it in the script field, or tick \"Review script first\" to read and approve the written script before anything else starts." },
  { q: "What is placed on screen?", a: "Only captions of what the presenter says, in the caption style you choose, plus your logo if you add one. No text cards, no buttons, no end cards." },
  { q: "Which videos can I translate?", a: "Videos you own, with the speaker's permission to use their voice and face. You confirm this before every translation." },
  { q: "How long does it take?", a: "A typical ad or translation is ready in a few minutes. You can leave the page; progress continues and the finished video lands on your dashboard." },
  { q: "What does a video cost?", a: "Each plan includes credits. The form shows the credits and the estimate for your choices before you start, and the project page shows what was really used afterwards." },
  { q: "What is a credit?", a: "One credit is one second of presenter video in Standard quality. Premium quality, product footage and translation are expressed in the same unit, so one number tells you what a video costs." },
  { q: "Do unused credits carry over?", a: "Credits from a subscription stay valid for the month they were issued and the month after. Credits from a top-up pack stay valid for a year." },
  { q: "Can I cancel?", a: "Yes, any time from Billing. Your plan stays active until the end of the period you paid for." },
  { q: "Where are my files stored?", a: "In our private storage. Links to your videos are signed per request and expire; nothing is public unless you share the file yourself." },
];
