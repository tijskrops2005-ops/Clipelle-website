export type FaqItem = { q: string; a: string };

/** Questions used on the homepage, the pricing page and /resources/faq. Own words, true today. */
export const faq: FaqItem[] = [
  { q: "What do I need to start?", a: "One product photo and two or three sentences about the product. The script, the presenter and the edit are made for you. For a translation you upload a video you own." },
  { q: "Can I use my own script?", a: "Yes. Paste it in the script field, or tick \"Review script first\" to read and approve the written script before anything else starts." },
  { q: "What is placed on screen?", a: "Only captions of what the presenter says, in the caption style you choose, plus your logo if you add one. No text cards, no buttons, no end cards." },
  { q: "Which videos can I translate?", a: "Videos you own, with the speaker's permission to use their voice and face. You confirm this before every translation." },
  { q: "How long does it take?", a: "A typical ad or translation is ready in a few minutes. You can leave the page; progress continues and the finished video lands on your dashboard." },
  { q: "What does a video cost?", a: "Each plan includes credits. The form shows the credits and the estimate for your choices before you start, and the project page shows what was really used afterwards." },
  { q: "Can I use a product page link instead of uploading photos?", a: "Yes. URL to video reads the name, description and photos from a public product page. You check and edit them, tick the photos you own, and the normal ad form opens prefilled." },
  { q: "Is there an API?", a: "Yes. On a plan with credits you can create keys in Settings → API keys and create ads and translations from your own code, with the same credits and limits as the form. There is also an MCP server for AI assistants." },
  { q: "Can I delete my data?", a: "Deleting a project removes its files. Deleting your account in Settings removes your projects, files, credits and profile; it cannot be undone." },
  { q: "Which languages can an ad be spoken in?", a: "The languages that have presenter voices, listed on the form. Translations of an existing video support 190 languages and regional variants." },
  { q: "Who owns the videos?", a: "You do. Clipelle makes them for you from your product and your inputs; use them wherever you like. For translations you confirm first that you own the source video and have the speaker's permission." },
  { q: "What is a credit?", a: "One credit is one second of translated video in Speed quality. Precision uses 2 credits per second, an ad 2 per second (at least 30) and a Premium ad 6. Every form shows the credits for your choices before you start." },
  { q: "Do unused credits carry over?", a: "Yes. Credits never expire: credits from a subscription or a credit pack stay on your account for as long as it exists, also after you cancel a subscription. Deleting your account forfeits them. The free first ad is the one exception: it expires 30 days after it is granted." },
  { q: "Can I cancel?", a: "Yes, any time from Billing. Your plan stays active until the end of the period you paid for." },
  { q: "Where are my files stored?", a: "In our private storage. Links to your videos are signed per request and expire; nothing is public unless you share the file yourself." },
];
