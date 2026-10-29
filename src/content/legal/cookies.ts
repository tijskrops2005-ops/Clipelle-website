import type { LegalDoc } from "./types";

/** Cookie policy, matching the banner (src/components/site/CookieBanner.tsx) and the consent cookie (src/lib/consent.ts). */
export const cookiesDoc: LegalDoc = {
  slug: "cookies",
  title: "Cookie policy",
  summary: "Which cookies Clipelle sets, what they do, and how you change your choice.",
  updated: "2026-10-29",
  draft: false,
  sections: [
    { heading: "Necessary cookies", paragraphs: ["These keep the site working and are set without asking."], bullets: ["Sign-in session: keeps you signed in to Studio after you log in. Removed when you sign out or when it expires.", "Consent choice (clipelle_consent): remembers whether you allowed optional cookies, for 180 days.", "Language choice (clipelle_lang): remembers the site language you picked. Set only after you allowed cookies; otherwise the language follows the address you visit."] },
    { heading: "Analytics cookies (optional, off by default)", paragraphs: ["We use Google Analytics 4 (Google Ireland Limited) to see which pages are visited, where visitors come from and how the site is used, in aggregate. It runs in Google's consent mode: until you accept, it sets no cookies and sends only cookieless signals without an identifier, which Google may use to estimate totals. Google signals and advertising features are off, and analytics data is kept for 14 months."], bullets: ["_ga: recognises a returning browser, up to 2 years. Only after you accept.", "_ga_<id>: keeps the state of a visit, up to 2 years. Only after you accept."] },
    { heading: "Counting without cookies", paragraphs: ["Our hosting provider (Vercel) counts page views and measures load times without cookies and without an identifier that follows you. Addresses are sent without their parameters, except campaign tags (utm_). Pages with a private link in their address (share links, invites, sign-in) are never measured, by either tool."] },
    { heading: "Partner tracking (optional, off by default)", paragraphs: ["Clipelle has a partner program run on an external platform. If you arrive through a partner's link and allow partner tracking, that platform's script may set a cookie so the partner is credited for your subscription. Without your consent the script is not loaded and no partner cookie is set."] },
    { heading: "Changing your choice", paragraphs: ["Open \"Cookie settings\" in the footer at any time to allow or withdraw a category. Declining or withdrawing analytics removes the _ga cookies straight away. Withdrawing partner tracking stops new loads of its script; a cookie it already set is removed when it expires or when you clear it in your browser."] },
    { heading: "No advertising cookies", paragraphs: ["Clipelle does not set advertising or cross-site profiling cookies, and Google's advertising signals stay switched off."] },
  ],
};

export const cookiesDocNl: LegalDoc = {
  slug: "cookies",
  title: "Cookiebeleid",
  summary: "Welke cookies Clipelle plaatst, wat ze doen en hoe je je keuze aanpast.",
  updated: "2026-10-29",
  draft: false,
  sections: [
    { heading: "Noodzakelijke cookies", paragraphs: ["Deze houden de site werkend en worden zonder vragen geplaatst."], bullets: ["Inlogsessie: houdt je ingelogd in Studio nadat je bent ingelogd. Verwijderd als je uitlogt of als de sessie verloopt.", "Toestemmingskeuze (clipelle_consent): onthoudt of je optionele cookies hebt toegestaan, 180 dagen.", "Taalkeuze (clipelle_lang): onthoudt de sitetaal die je koos. Wordt alleen geplaatst nadat je een cookiekeuze hebt gemaakt; anders volgt de taal het adres dat je bezoekt."] },
    { heading: "Analysecookies (optioneel, standaard uit)", paragraphs: ["We gebruiken Google Analytics 4 (Google Ireland Limited) om te zien welke pagina's worden bezocht, waar bezoekers vandaan komen en hoe de site in het algemeen wordt gebruikt. Het draait in de toestemmingsmodus van Google: tot je accepteert, plaatst het geen cookies en stuurt het alleen cookieloze signalen zonder kenmerk, waarmee Google totalen kan schatten. Google-signalen en advertentiefuncties staan uit en analysegegevens bewaren we 14 maanden."], bullets: ["_ga: herkent een terugkerende browser, tot 2 jaar. Alleen na je toestemming.", "_ga_<id>: houdt de stand van een bezoek bij, tot 2 jaar. Alleen na je toestemming."] },
    { heading: "Tellen zonder cookies", paragraphs: ["Onze hostingprovider (Vercel) telt paginaweergaven en meet laadtijden zonder cookies en zonder kenmerk dat je volgt. Adressen gaan mee zonder hun parameters, behalve campagnelabels (utm_). Pagina's met een privélink in het adres (deellinks, uitnodigingen, inloggen) worden door geen van beide gemeten."] },
    { heading: "Partnertracking (optioneel, standaard uit)", paragraphs: ["Clipelle heeft een partnerprogramma dat op een extern platform loopt. Als je via een partnerlink binnenkomt en partnertracking toestaat, kan het script van dat platform een cookie plaatsen zodat de partner wordt meegeteld voor je abonnement. Zonder je toestemming wordt het script niet geladen en wordt er geen partnercookie geplaatst."] },
    { heading: "Je keuze aanpassen", paragraphs: ["Open \"Cookie-instellingen\" in de voettekst om een categorie toe te staan of in te trekken. Weiger je analyse of trek je die in, dan worden de _ga-cookies meteen verwijderd. Partnertracking intrekken stopt nieuwe ladingen van dat script; een cookie die het al plaatste verdwijnt als hij verloopt of als je hem in je browser wist."] },
    { heading: "Geen advertentiecookies", paragraphs: ["Clipelle plaatst geen advertentie- of profileringscookies over sites heen, en de advertentiesignalen van Google blijven uit."] },
  ],
};
