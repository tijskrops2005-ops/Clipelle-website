import type { FaqItem } from "./faq";
import { CREDIT_EXPIRY } from "@/lib/plans";

/** FAQ on /pricing, in our own words and true today (FAQPage schema on the page). */
export const pricingFaq: FaqItem[] = [
  { q: "What is the free ad?", a: `One 10-second ad with the Standard presenter after you verify your e-mail. No card. It expires ${CREDIT_EXPIRY.freeAdDays} days after it is granted.` },
  { q: "How do credits work, and do they expire?", a: "One credit is one second of Standard presenter video; every form shows the credits for your choices before you start, and the project page shows what was really used. Credits from a subscription or a pack never expire while your account exists, also after you cancel. Deleting your account forfeits them." },
  { q: "What are teams and members?", a: "A team workspace shares one credit pool. The Owner manages the plan, credits and members; Members make and see the team's projects. There is no cost per seat; the Business plan is per workspace." },
  { q: "Can I change or cancel my plan?", a: "Yes, any time in Billing through the customer portal. A change applies from the next period; cancelling keeps the plan active until the end of the period you paid for, and your credits stay." },
  { q: "Who owns the videos?", a: "You do. Use them wherever you like. For translations you confirm first that you own the source video and have the speaker's permission." },
  { q: "Do you refund?", a: "The terms draft says what applies: a project that fails is refunded in credits automatically. Refunds of payments are handled case by case through the contact form while the terms are in review." },
  { q: "Which links and languages are supported?", a: "URL to video reads public product pages with product data, sharing tags or a title and photos. Ads can be spoken in the languages that have presenter voices; translations support 190 languages and regional variants." },
  { q: "Is the API included?", a: "Yes, on every plan with credits. Keys are made in Settings → API keys and use the same credits and limits as the form. There is also an MCP server for assistants." },
  { q: "What is the managed service?", a: "We run Reelay for you: products in, finished ads out, scripts reviewed by a person. Scope and price are agreed per brand on a call; there is no fixed offer on this page." },
];

export const pricingFaqNl: FaqItem[] = [
  { q: "Wat is de gratis advertentie?", a: `Eén advertentie van 10 seconden met de Standard-presentator nadat je je e-mailadres hebt bevestigd. Geen kaart. Ze vervalt ${CREDIT_EXPIRY.freeAdDays} dagen na toekenning.` },
  { q: "Hoe werken credits, en vervallen ze?", a: "Eén credit is één seconde Standard-presentatorvideo; elk formulier toont de credits voor jouw keuzes voordat je begint, en de projectpagina laat zien wat er echt is gebruikt. Credits uit een abonnement of pakket vervallen nooit zolang je account bestaat, ook nadat je opzegt. Je account verwijderen laat ze vervallen." },
  { q: "Wat zijn teams en leden?", a: "Een teamworkspace deelt één creditpot. De eigenaar beheert plan, credits en leden; leden maken en zien de projecten van het team. Er zijn geen kosten per zitplaats; het Business-plan is per workspace." },
  { q: "Kan ik mijn plan wijzigen of opzeggen?", a: "Ja, altijd, in Billing via het klantportaal. Een wijziging geldt vanaf de volgende periode; opzeggen houdt het plan actief tot het einde van de betaalde periode, en je credits blijven." },
  { q: "Van wie zijn de video's?", a: "Van jou. Gebruik ze waar je wilt. Voor vertalingen bevestig je eerst dat de bronvideo van jou is en dat je de toestemming van de spreker hebt." },
  { q: "Betalen jullie terug?", a: "Het concept van de voorwaarden zegt wat geldt: een mislukt project wordt automatisch in credits terugbetaald. Terugbetalingen van betalingen behandelen we per geval via het contactformulier zolang de voorwaarden in beoordeling zijn." },
  { q: "Welke links en talen worden ondersteund?", a: "Van link naar video leest openbare productpagina's met productgegevens, deeltags of een titel en foto's. Advertenties kunnen worden ingesproken in de talen met presentatorstemmen; vertalingen ondersteunen 190 talen en regionale varianten." },
  { q: "Is de API inbegrepen?", a: "Ja, op elk plan met credits. Sleutels maak je onder Settings → API keys; ze gebruiken dezelfde credits en limieten als het formulier. Er is ook een MCP-server voor assistenten." },
  { q: "Wat is de beheerde dienst?", a: "Wij draaien Reelay voor je: producten erin, afgeronde advertenties eruit, scripts door een mens gecontroleerd. Omvang en prijs worden per merk in een gesprek afgesproken; er staat geen vast aanbod op deze pagina." },
];
export const pricingFaqFor = (locale: "en" | "nl") => (locale === "en" ? pricingFaq : pricingFaqNl);
