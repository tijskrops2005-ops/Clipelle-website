import type { AdTone } from "@/lib/adOptions";

/**
 * The format library (2026-10-21): real presets for the ad form. A format fills EXISTING fields
 * only: it writes a short direction for the script (structure and hook style, as data for the
 * script step) and picks a tone. Nothing new is sent to a provider; without a chosen format the
 * form sends exactly what it always sent. The key is kept on the project so versions, batches
 * and the result page can name it.
 */
export type FormatKey = "unboxing" | "testimonial" | "before-after" | "problem-fix" | "three-reasons" | "product-demo" | "founder-story" | "offer";

export type AdFormat = {
  key: FormatKey;
  name: string;
  /** One line under the name. */
  blurb: string;
  /** Which products it suits. */
  worksFor: string;
  /** How the spoken script is built, in order. Shown to the customer; the gist goes into the direction. */
  structure: string[];
  /** The first spoken line's style. */
  hookStyle: string;
  /** Direction written into the form's Direction field (max 200 characters there; this stays well under). */
  direction: string;
  tone: AdTone;
  /** Dutch copy for the site (the app stays English). */
  nl: { name: string; blurb: string; worksFor: string };
};

export const FORMATS: AdFormat[] = [
  {
    key: "unboxing",
    name: "Unboxing",
    blurb: "The presenter opens the box and reacts to what is inside.",
    worksFor: "Physical products with a satisfying first impression: packaging, gadgets, beauty, food.",
    structure: ["Hook: what just arrived", "First look and the detail that stands out", "What it does and for whom", "Call to action"],
    hookStyle: "Curiosity: \"This just arrived…\"",
    direction: "Unboxing: react to the first look, name one standout detail, then what it does. Open with curiosity.",
    tone: "playful",
    nl: { name: "Unboxing", blurb: "De presentator opent de doos en reageert op wat erin zit.", worksFor: "Fysieke producten met een sterke eerste indruk: verpakking, gadgets, beauty, food." },
  },
  {
    key: "testimonial",
    name: "Testimonial",
    blurb: "A first-person story: what the presenter used it for and what changed.",
    worksFor: "Products with a clear everyday benefit: skincare, supplements, home, fitness.",
    structure: ["Hook: a result in one sentence", "The situation before", "How the product fit in", "Call to action"],
    hookStyle: "Result first: \"Two weeks in and…\"",
    direction: "Testimonial in the first person: start with the result, describe the situation before, how it fit in. Honest, no exaggerated claims.",
    tone: "warm",
    nl: { name: "Testimonial", blurb: "Een verhaal in de ik-vorm: waarvoor de presentator het gebruikte en wat er veranderde.", worksFor: "Producten met een duidelijk dagelijks voordeel: huidverzorging, supplementen, huis, fitness." },
  },
  {
    key: "before-after",
    name: "Before and after",
    blurb: "The problem state, then the result, with the product as the turning point.",
    worksFor: "Anything with a visible or felt result: cleaning, care, organisation, comfort.",
    structure: ["Hook: the before in one line", "What it was like", "The turning point", "The after and the call to action"],
    hookStyle: "Contrast: \"This was my desk every morning…\"",
    direction: "Before and after: paint the before in one line, the turning point with the product, then the after. Keep claims to what the description says.",
    tone: "direct",
    nl: { name: "Voor en na", blurb: "Eerst het probleem, dan het resultaat, met het product als kantelpunt.", worksFor: "Alles met een zichtbaar of voelbaar resultaat: schoonmaak, verzorging, opbergen, comfort." },
  },
  {
    key: "problem-fix",
    name: "Problem to fix",
    blurb: "Name a frustration, then show the product solving it.",
    worksFor: "Problem-solving products: tools, accessories, kitchen, travel.",
    structure: ["Hook: the frustration as a question", "Why it is annoying", "The fix, step by step", "Call to action"],
    hookStyle: "Question: \"Tired of…?\"",
    direction: "Problem to fix: open with the frustration as a question, say why it annoys, then the fix in two steps. Practical, concrete.",
    tone: "direct",
    nl: { name: "Van probleem naar oplossing", blurb: "Benoem een ergernis en laat het product die oplossen.", worksFor: "Probleemoplossende producten: gereedschap, accessoires, keuken, reizen." },
  },
  {
    key: "three-reasons",
    name: "Three reasons",
    blurb: "A quick list of three reasons to want it, one sentence each.",
    worksFor: "Products with several distinct benefits: apparel, electronics, subscriptions.",
    structure: ["Hook: \"Three reasons…\"", "Reason one, two, three (one sentence each)", "Call to action"],
    hookStyle: "List: \"Three reasons this is on my desk\"",
    direction: "Three reasons: open with 'three reasons', then three benefits in one sentence each, numbered in speech, then the call to action.",
    tone: "direct",
    nl: { name: "Drie redenen", blurb: "Een snelle lijst van drie redenen om het te willen, één zin per reden.", worksFor: "Producten met meerdere duidelijke voordelen: kleding, elektronica, abonnementen." },
  },
  {
    key: "product-demo",
    name: "Product demo",
    blurb: "Show how it works, feature by feature, while the presenter explains.",
    worksFor: "Products that need a moment of explanation: devices, software, tools, kits.",
    structure: ["Hook: what it does in one line", "How it works, in order of use", "The detail people miss", "Call to action"],
    hookStyle: "Plain promise: \"Here is how it works\"",
    direction: "Product demo: say what it does in one line, then how it works in order of use, end with one detail people miss. Clear and calm.",
    tone: "elegant",
    nl: { name: "Productdemo", blurb: "Laat zien hoe het werkt, functie voor functie, terwijl de presentator uitlegt.", worksFor: "Producten die een moment uitleg nodig hebben: apparaten, software, gereedschap, sets." },
  },
  {
    key: "founder-story",
    name: "Founder story",
    blurb: "Why this was made, told by the maker.",
    worksFor: "Small brands with a reason behind the product: craft, food, sustainable goods.",
    structure: ["Hook: the moment it started", "What was missing", "What you made instead", "Call to action"],
    hookStyle: "Personal: \"I made this because…\"",
    direction: "Founder story in the first person: the moment it started, what was missing, what you made instead. Warm, no hype, only facts from the description.",
    tone: "warm",
    nl: { name: "Verhaal van de maker", blurb: "Waarom dit gemaakt is, verteld door de maker.", worksFor: "Kleine merken met een reden achter het product: ambacht, food, duurzame spullen." },
  },
  {
    key: "offer",
    name: "Offer announcement",
    blurb: "A short, clear announcement of a deal with the product and the deadline.",
    worksFor: "Launches, sales and bundles; works best with the Offer field filled in.",
    structure: ["Hook: the offer in one line", "What you get", "Why now", "Call to action with the offer"],
    hookStyle: "Announcement: \"This week only…\"",
    direction: "Offer announcement: the deal in the first line, what you get, why now, call to action with the offer. Mention the offer only as given.",
    tone: "direct",
    nl: { name: "Aanbieding", blurb: "Een korte, duidelijke aankondiging van een deal met het product en de deadline.", worksFor: "Lanceringen, uitverkoop en bundels; werkt het best met het veld Aanbieding ingevuld." },
  },
];

export const FORMAT_KEYS = FORMATS.map((f) => f.key) as [FormatKey, ...FormatKey[]];

/**
 * Hook styles for "Make variations": the same product with a different first line. Like a
 * format, a hook style only fills the Direction field (as data for the script step).
 */
export type HookKey = "question" | "curiosity" | "result" | "contrast" | "list" | "announcement";
export type HookStyle = { key: HookKey; name: string; blurb: string; direction: string; nl: { name: string; blurb: string } };
export const HOOK_STYLES: HookStyle[] = [
  { key: "question", name: "Question", blurb: "Opens with the viewer's own frustration as a question.", direction: "Open with a question the viewer would ask about this problem, then answer it with the product.", nl: { name: "Vraag", blurb: "Opent met de ergernis van de kijker als vraag." } },
  { key: "curiosity", name: "Curiosity", blurb: "Opens with something unexpected that makes you wait for the explanation.", direction: "Open with one surprising, true detail about the product and explain it in the next line.", nl: { name: "Nieuwsgierigheid", blurb: "Opent met iets onverwachts waardoor je op de uitleg wacht." } },
  { key: "result", name: "Result first", blurb: "Opens with what changed, then how.", direction: "Open with the result the product gives, stated plainly, then how it gets there.", nl: { name: "Resultaat eerst", blurb: "Opent met wat er veranderde, daarna hoe." } },
  { key: "contrast", name: "Contrast", blurb: "Opens with the before, then flips to the after.", direction: "Open with the situation before the product in one line, then flip to the situation with it.", nl: { name: "Contrast", blurb: "Opent met het 'voor', en kantelt dan naar het 'na'." } },
  { key: "list", name: "Numbered list", blurb: "Opens by promising a short list, then delivers it.", direction: "Open by promising three short points, then give them in one sentence each.", nl: { name: "Genummerde lijst", blurb: "Opent met de belofte van een korte lijst en levert die." } },
  { key: "announcement", name: "Announcement", blurb: "Opens like news: what is new and why it matters now.", direction: "Open like an announcement: what is new about this product and why it matters today.", nl: { name: "Aankondiging", blurb: "Opent als nieuws: wat is er nieuw en waarom nu." } },
];
export const HOOK_KEYS = HOOK_STYLES.map((h) => h.key) as [HookKey, ...HookKey[]];
export function hookByKey(key: string | undefined | null): HookStyle | undefined {
  return key ? HOOK_STYLES.find((h) => h.key === key) : undefined;
}
export function isHookKey(value: string): value is HookKey {
  return HOOK_STYLES.some((h) => h.key === value);
}

/** One variant of a batch: a format or a hook style (never both). */
export type Variant = { format: FormatKey } | { hook: HookKey };
export const MIN_BATCH_VARIANTS = 2;
export const MAX_BATCH_VARIANTS = 5;
export function variantLabel(v: Variant) {
  return "format" in v ? (formatByKey(v.format)?.name ?? v.format) : `${hookByKey(v.hook)?.name ?? v.hook} hook`;
}
/** The Direction and tone a variant gives the script, on top of the seller's own direction. */
export function variantFields(v: Variant, ownDirection: string, ownTone: AdTone, maxChars: number): { direction: string; tone: AdTone; format?: FormatKey; hook?: HookKey } {
  const own = ownDirection.trim();
  if ("format" in v) {
    const f = formatByKey(v.format)!;
    return { direction: (own ? `${own} ${f.direction}` : f.direction).slice(0, maxChars), tone: f.tone, format: v.format };
  }
  const h = hookByKey(v.hook)!;
  return { direction: (own ? `${own} ${h.direction}` : h.direction).slice(0, maxChars), tone: ownTone, hook: v.hook };
}

export function formatByKey(key: string | undefined | null): AdFormat | undefined {
  return key ? FORMATS.find((f) => f.key === key) : undefined;
}

export function isFormatKey(value: string): value is FormatKey {
  return FORMATS.some((f) => f.key === value);
}
