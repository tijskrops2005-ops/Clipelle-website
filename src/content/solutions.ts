/**
 * Use-case pages (/solutions/[slug]). Every "how Reelay helps" item names a real feature; the example
 * flow is an illustration of the steps, clearly labelled as an example, never a customer story.
 */
export type Solution = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  problem: { title: string; points: string[] };
  helps: { title: string; text: string }[];
  example: { title: string; steps: string[] };
  faq: { q: string; a: string }[];
};

export const solutions: Solution[] = [
  {
    slug: "ecommerce-brands",
    title: "A steady flow of product ads without a studio day",
    eyebrow: "E-commerce brands",
    intro: "A shop with a catalogue needs a new ad every week, for products that change. Reelay turns one product photo and a few sentences into a finished 9:16 ad with a presenter and captions, at a cost you see before you start.",
    problem: { title: "The problem", points: ["A shoot takes a day and covers a handful of products; the catalogue has hundreds.", "Every ad needs a script, footage, a presenter, an edit and captions, in that order, in different tools.", "Costs are only known at the invoice."] },
    helps: [
      { title: "One form per product", text: "Photo, name, two sentences, length. The script is written, the product clip is generated, the presenter speaks, the edit is cut with captions." },
      { title: "Brand defaults", text: "Accent colour, caption look, font and logo saved once in Settings and applied to every new ad." },
      { title: "Costs before you click", text: "The form shows credits and dollars for your choices; the project page shows the real amount afterwards." },
      { title: "A product page link", text: "URL to video reads name, description and photos from your product page so the form starts filled in." },
      { title: "From your own code", text: "The API creates the same ads from a product feed or a sync job, with the same credits and limits." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Monday: paste the product page of the new arrival into URL to video; check the description, tick two photos.", "Choose 30 seconds, Standard, the brand voice; tick Review script first.", "Pick one of three hooks, approve; the clip, the presenter and the edit run on their own.", "Download the 9:16 ad from the project page; the real amount sits next to the estimate."] },
    faq: [
      { q: "Can I keep one presenter for every ad?", a: "Yes. Pick the same presenter and voice on each form, or make one choice and reuse it through the API." },
      { q: "What about several products in one ad?", a: "An ad is built around one product and one product clip. Make one ad per product; it keeps every ad clear." },
      { q: "Do I need to write anything?", a: "Two or three factual sentences. The script is written from them; you can review it before anything is paid, or paste your own." },
    ],
  },
  {
    slug: "shopify-stores",
    title: "Turn product pages into ads, one link at a time",
    eyebrow: "Shopify stores",
    intro: "Most product pages already carry what an ad needs: a name, a description and good photos. Reelay reads a public product page, lets you check and correct what it found, and makes the ad from there.",
    problem: { title: "The problem", points: ["Product data lives on the page; retyping it into an ad tool is slow and error-prone.", "Photos are already shot; what is missing is motion, a voice and captions.", "A new ad per product, per week, does not fit a manual process."] },
    helps: [
      { title: "URL to video", text: "Paste the product link. Name, description, photos and price are read from the page's product data; you check and edit them before anything is used." },
      { title: "Only the photos you tick", text: "Photos are copied only after you confirm; use products and photos you own or have the rights to use." },
      { title: "The same ad form", text: "Length, presenter, voice, tone, offer and brand style, exactly as with an uploaded photo." },
      { title: "Automation through the API", text: "Create ads from your own scripts or tools with an API key; a project per product, idempotent on retries." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Paste the product page link; the form shows the name, description and six photos found on the page.", "Shorten the description to the facts; tick the three photos you own.", "Add the offer line from this week's promotion; generate.", "Download the finished 9:16 ad; post it to TikTok, Reels or Shorts."] },
    faq: [
      { q: "Does it work with any shop platform?", a: "It works with any public product page that carries product data, sharing tags or at least a title and photos. Pages behind a login cannot be read." },
      { q: "Is there a Shopify app?", a: "Not yet. Today you paste a link, or use the API from your own code." },
      { q: "Is the page sent to an AI?", a: "No. The page is read by plain code; the script is written later from the description you approved." },
    ],
  },
  {
    slug: "dropshipping",
    title: "Test a product with a video before you commit stock",
    eyebrow: "Dropshipping",
    intro: "When you test products fast, a video per candidate is the bottleneck. Reelay makes a short ad from the product photo you already have, so the test can start before the first order.",
    problem: { title: "The problem", points: ["A test needs a video, and the product is not in your hands yet.", "Dozens of candidates a month do not fit a shoot or an editor.", "Spending on creatives must stay predictable while the product is unproven."] },
    helps: [
      { title: "An ad from the photo you have", text: "One clear product photo becomes a product clip with slow camera moves; a presenter speaks the pitch; captions make it readable without sound." },
      { title: "Short lengths", text: "10 or 20 seconds keep a first test cheap; 30 seconds when the product deserves a full story." },
      { title: "Small variations", text: "Same product, different hook or tone: review the script, pick another hook, generate again." },
      { title: "Costs you can plan", text: "Credits per length are fixed and shown before you start; the real amount is shown afterwards." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Upload the supplier's product photo you have the rights to use; write three factual sentences.", "Choose 20 seconds, Standard, a Direct tone; tick Review script first.", "Approve a hook that names the problem the product solves.", "Run the ad; if it holds attention, make the 30-second version with the Offer line."] },
    faq: [
      { q: "Can I use supplier photos?", a: "Only photos you own or have the rights to use. The form asks you to confirm that." },
      { q: "How fast is a video ready?", a: "Typically within minutes; you can leave the page and the finished video lands on your dashboard." },
      { q: "Does Reelay launch the ads?", a: "No. Reelay makes the video; you run the campaign in your ad platform." },
    ],
  },
  {
    slug: "agencies",
    title: "Many brands, one process, costs known before each video",
    eyebrow: "Agencies",
    intro: "An agency runs the same production process for every client, with different inputs. Reelay keeps that process fixed and shows the cost of every video before it starts, so quoting and delivering stay simple.",
    problem: { title: "The problem", points: ["Every client ad goes through the same steps, by hand, in several tools.", "Brand consistency per client takes discipline across the team.", "Clients want to know the cost before the work, not after."] },
    helps: [
      { title: "A fixed process", text: "Script, product clip, presenter, final edit, always in that order, with the same quality checks." },
      { title: "Brand style per video", text: "Accent colour, caption look, font and logo per ad; a client's defaults can be saved in the account used for that client." },
      { title: "Estimates on every form", text: "Credits and dollars before you click; the real amount on the project page for your own records." },
      { title: "The API for volume", text: "Create ads and translations from your own tooling with an API key; projects stay per account." },
      { title: "Translations for international clients", text: "A client's video in several languages with the speaker's own voice, each version with captions." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Receive a client's product sheet; paste the product page into URL to video.", "Apply the client's colour, caption look and logo in the brand style block.", "Tick Review script first; send the three hooks to the client, approve the chosen one.", "Deliver the 9:16 ad and the German and French versions from the translate workflow."] },
    faq: [
      { q: "Can several people work in one account?", a: "Today an account belongs to one sign-in. Shared team workspaces are planned; until then one account per client or per agency is the practical setup." },
      { q: "Can we white-label Reelay?", a: "No. The finished videos carry no Reelay branding; the app itself is Reelay." },
      { q: "How do we bill clients?", a: "The project page shows the real amount per video; the usage page lists spending per project for your own invoicing." },
    ],
  },
  {
    slug: "apps-and-saas",
    title: "Explain a feature in a vertical video with a presenter",
    eyebrow: "Apps and SaaS",
    intro: "A feature explained in 30 spoken seconds, with a screenshot as the product footage, travels well on vertical platforms. Reelay makes that video from one image and a short description.",
    problem: { title: "The problem", points: ["Screen recordings are long and need a voice, captions and an edit.", "A presenter on camera costs a shoot; a slide deck does not hold attention.", "Every feature launch needs the same video again."] },
    helps: [
      { title: "A screenshot as the product", text: "Upload a clean screenshot or app visual; it becomes the product clip with slow camera moves while the presenter explains." },
      { title: "A spoken script within a limit", text: "Hook, the problem the feature solves, what it does, the call to action, in about 75 words for 30 seconds." },
      { title: "Captions for silent viewing", text: "Everything the presenter says is on screen as captions; your accent colour highlights the spoken word." },
      { title: "Languages", text: "Make the ad in another language, or translate the finished video with the same voice." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Upload one screenshot of the new dashboard; describe what it does and for whom.", "Choose 30 seconds, a Warm tone, the presenter who matches the brand.", "Review the script; keep the hook that names the pain point.", "Download the ad; translate it into Spanish for the Latin American launch."] },
    faq: [
      { q: "Can the product clip show a screen recording?", a: "The product clip is generated from one still image. Use a clean screenshot; a recording is not an input today." },
      { q: "Can the presenter say technical terms?", a: "Yes; write them in the description or your own script. For translations, add them as terms to keep." },
      { q: "Is there an end card with a button?", a: "No. The only text on screen is the captions; the call to action is spoken." },
    ],
  },
  {
    slug: "creators-and-localization",
    title: "One video, many languages, your own voice",
    eyebrow: "Creators and localization",
    intro: "A creator's video works in one language; the audience speaks ten. Reelay translates a video you own into other languages with your own voice and matching lips, and burns in captions for each.",
    problem: { title: "The problem", points: ["Re-recording in every language is impossible; subtitles alone lose the connection.", "Dubbing with another voice changes who is speaking.", "Each version needs its own captions and a check of names and numbers."] },
    helps: [
      { title: "Your voice, other words", text: "The translation keeps the speaker's own voice and matches the lips to the new language, in Speed or Precision quality." },
      { title: "190 languages and variants", text: "Several at once; each version renders in parallel and gets its own captions." },
      { title: "An automatic check per line", text: "Every translated line is compared with the original for missing or added words, meaning, numbers and names, and corrected within the timing." },
      { title: "Terms to keep", text: "Your name, your product names and your catchphrases stay as they are." },
      { title: "Rights first", text: "You confirm you own the video and have the speaker's permission before anything starts." },
    ],
    example: { title: "Example flow (illustration, not a customer story)", steps: ["Upload the 60-second video; leave the spoken language on Detect automatically.", "Pick German, French and Portuguese (Brazil); keep Speed; add the channel name to Terms to keep.", "The quality check lists two corrected lines and one warning about a number; check them.", "Download three videos, each with captions, ready for the regional channels."] },
    faq: [
      { q: "Does my accent survive?", a: "The voice stays yours; the pronunciation follows the new language. Listen to the result and adjust terms to keep if a name is read oddly." },
      { q: "How long can the video be?", a: "Up to 32 MB and three minutes per upload today." },
      { q: "Can I edit the translation?", a: "The automatic check corrects lines within the timing and shows what it changed. Manual editing per line is not part of the flow." },
    ],
  },
];

export const solutionBySlug = (slug: string) => solutions.find((s) => s.slug === slug);
