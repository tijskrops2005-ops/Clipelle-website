import type { LegalDoc } from "./types";

/** Cookie policy, matching the banner (src/components/site/CookieBanner.tsx) and the consent cookie (src/lib/consent.ts). */
export const cookiesDoc: LegalDoc = {
  slug: "cookies",
  title: "Cookie policy",
  summary: "Which cookies Reelay sets, what they do, and how you change your choice.",
  updated: "2026-10-21",
  draft: true,
  sections: [
    { heading: "Necessary cookies", paragraphs: ["These keep the site working and are set without asking."], bullets: ["Sign-in session: keeps you signed in to Studio after you log in. Removed when you sign out or when it expires.", "Consent choice (reelay_consent): remembers whether you allowed optional cookies, for 180 days.", "Language choice (reelay_lang): remembers the site language you picked. Set only after you allowed cookies; otherwise the language follows the address you visit."] },
    { heading: "Analytics (optional, off by default)", paragraphs: ["If you allow analytics, a measurement script may load to tell us which pages are visited and how the site is used in aggregate. Which provider, if any, is set by the site's configuration; when none is configured, nothing loads even with your consent."] },
    { heading: "Partner tracking (optional, off by default)", paragraphs: ["Reelay has a partner program run on an external platform. If you arrive through a partner's link and allow partner tracking, that platform's script may set a cookie so the partner is credited for your subscription. Without your consent the script is not loaded and no partner cookie is set."] },
    { heading: "Changing your choice", paragraphs: ["Open \"Cookie settings\" in the footer at any time to allow or withdraw a category. Withdrawing stops new loads of the optional scripts; cookies already set by a provider are removed when they expire or when you clear them in your browser."] },
    { heading: "No advertising cookies", paragraphs: ["Reelay does not set advertising or cross-site profiling cookies of its own."] },
  ],
};

export const cookiesDocNl: LegalDoc = {
  slug: "cookies",
  title: "Cookiebeleid",
  summary: "Welke cookies Reelay plaatst, wat ze doen en hoe je je keuze aanpast.",
  updated: "2026-10-21",
  draft: true,
  sections: [
    { heading: "Noodzakelijke cookies", paragraphs: ["Deze houden de site werkend en worden zonder vragen geplaatst."], bullets: ["Inlogsessie: houdt je ingelogd in Studio nadat je bent ingelogd. Verwijderd als je uitlogt of als de sessie verloopt.", "Toestemmingskeuze (reelay_consent): onthoudt of je optionele cookies hebt toegestaan, 180 dagen.", "Taalkeuze (reelay_lang): onthoudt de sitetaal die je koos. Wordt alleen geplaatst nadat je een cookiekeuze hebt gemaakt; anders volgt de taal het adres dat je bezoekt."] },
    { heading: "Analyse (optioneel, standaard uit)", paragraphs: ["Als je analyse toestaat, kan een meetscript laden dat ons vertelt welke pagina's worden bezocht en hoe de site in het algemeen wordt gebruikt. Welke provider, als die er is, wordt bepaald door de instellingen van de site; zonder ingestelde provider laadt er niets, ook niet met je toestemming."] },
    { heading: "Partnertracking (optioneel, standaard uit)", paragraphs: ["Reelay heeft een partnerprogramma dat op een extern platform loopt. Als je via een partnerlink binnenkomt en partnertracking toestaat, kan het script van dat platform een cookie plaatsen zodat de partner wordt meegeteld voor je abonnement. Zonder je toestemming wordt het script niet geladen en wordt er geen partnercookie geplaatst."] },
    { heading: "Je keuze aanpassen", paragraphs: ["Open \"Cookie-instellingen\" in de voettekst om een categorie toe te staan of in te trekken. Intrekken stopt nieuwe ladingen van de optionele scripts; cookies die een provider al plaatste verdwijnen als ze verlopen of als je ze in je browser wist."] },
    { heading: "Geen advertentiecookies", paragraphs: ["Reelay plaatst zelf geen advertentie- of profileringscookies over sites heen."] },
  ],
};
