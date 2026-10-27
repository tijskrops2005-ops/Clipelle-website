import type { FaqItem } from "./faq";
import { config } from "@/lib/config";
import type { Locale } from "@/lib/i18n";

/**
 * Dutch versions of the FAQ entries, keyed by the English question. An entry without a Dutch
 * version falls back to English (and shows as such), so a new question never breaks the Dutch page.
 * `translateOnly` is the answer while ads are off (config.features.ads), like faq.ts.
 */
export const faqNl: Record<string, FaqItem & { translateOnly?: string }> = {
  "What do I need to start?": { q: "Wat heb ik nodig om te beginnen?", a: "Voor een vertaling: een video van jezelf met één duidelijke spreker. Jij kiest de talen; de spreker houdt de eigen stem en de lippen bewegen mee. Voor een nieuwe advertentie: één productfoto en twee of drie zinnen over het product.", translateOnly: "Een video van jezelf met één duidelijke spreker, tot 32 MB en drie minuten. Jij kiest de talen; de spreker houdt de eigen stem en de lippen bewegen mee." },
  "Can I use my own script?": { q: "Kan ik mijn eigen script gebruiken?", a: "Ja. Plak het in het scriptveld, of vink \"Review script first\" aan om het geschreven script te lezen en goed te keuren voordat de rest start." },
  "What is placed on screen?": { q: "Wat komt er in beeld?", a: "Alleen ondertitels van wat er gezegd wordt, in de ondertitelstijl die jij kiest, plus je logo op een advertentie als je dat toevoegt. Geen tekstkaarten, geen knoppen, geen eindkaarten.", translateOnly: "Alleen ondertitels van wat er gezegd wordt, in de ondertitelstijl die jij kiest. Geen tekstkaarten, geen knoppen, geen eindkaarten." },
  "Which videos can I translate?": { q: "Welke video's kan ik vertalen?", a: "Video's van jezelf, tot 32 MB en drie minuten, met toestemming van de spreker om stem en gezicht te gebruiken. Dat bevestig je vóór elke vertaling." },
  "How long does it take?": { q: "Hoe lang duurt het?", a: "In onze eigen gemeten runs was een korte vertaling na ongeveer 4,5 minuut klaar en een advertentie van 30 seconden na ongeveer 6. Langere video's duren langer. Je kunt de pagina verlaten; de afgeronde video verschijnt op je dashboard.", translateOnly: "In onze eigen gemeten runs was een korte vertaling na ongeveer 4,5 minuut klaar. Langere video's en meer talen duren langer. Je kunt de pagina verlaten; we mailen je als het klaar is." },
  "Can I use a product page link instead of uploading photos?": { q: "Kan ik een productpagina-link gebruiken in plaats van foto's uploaden?", a: "Ja. Van link naar video leest naam, omschrijving en foto's van een openbare productpagina. Jij controleert en past aan, vinkt de foto's aan die van jou zijn, en het normale advertentieformulier opent ingevuld." },
  "Is there an API?": { q: "Is er een API?", a: "Ja. Op een plan met credits maak je sleutels aan onder Settings → API keys en maak je advertenties en vertalingen vanuit je eigen code, met dezelfde credits en limieten als het formulier. Er is ook een MCP-server voor AI-assistenten.", translateOnly: "Ja. Op een plan met credits maak je sleutels aan onder Settings → API keys en vertaal je video's vanuit je eigen code, met dezelfde credits en limieten als het formulier. Er is ook een MCP-server voor AI-assistenten." },
  "Can I delete my data?": { q: "Kan ik mijn gegevens verwijderen?", a: "Een project verwijderen verwijdert de bestanden. Je account verwijderen in Settings verwijdert je projecten, bestanden, credits en profiel; dat kan niet ongedaan worden gemaakt." },
  "Which languages are supported?": { q: "Welke talen worden ondersteund?", a: "Vertalingen ondersteunen 190 talen en regionale varianten. Een advertentie, of een vertaling ingesproken door een AI-presentator, werkt in de talen met presentatorstemmen, zoals het formulier ze toont.", translateOnly: "190 talen en regionale varianten. Vertalen met een AI-presentator werkt in de talen met presentatorstemmen, zoals het formulier ze toont." },
  "Who owns the videos?": { q: "Van wie zijn de video's?", a: "Van jou. Clipelle maakt ze voor je uit jouw product en jouw invoer; gebruik ze waar je wilt. Voor vertalingen bevestig je eerst dat de bronvideo van jou is en dat je de toestemming van de spreker hebt.", translateOnly: "Van jou. Clipelle maakt ze uit jouw video en jouw keuzes; gebruik ze waar je wilt. Je bevestigt eerst dat de bronvideo van jou is en dat je de toestemming van de spreker hebt." },
  "What does a video cost?": { q: "Wat kost een video?", a: "Credits, naar lengte. Een minuut vertalen in Speed kost 60 credits per taal; een advertentie van 30 seconden 60. Elk formulier toont de credits voordat je begint, en een video die mislukt kost niets.", translateOnly: "Credits, naar lengte. Een minuut vertalen in Speed kost 60 credits per taal, in Precision 120. Het formulier toont de credits voordat je begint, en een taalversie die mislukt kost niets." },
  "What is a credit?": { q: "Wat is een credit?", a: "Eén credit is één seconde vertaalde video in Speed-kwaliteit, per taal. Precision gebruikt 2 per seconde, een advertentie 2 per seconde (minimaal 30) en een Premium-advertentie 6. Een korte vertaling kost minimaal 10 credits per taal.", translateOnly: "Eén credit is één seconde vertaalde video in Speed-kwaliteit, per taal. Precision gebruikt 2 per seconde en beeldverbetering voegt er 1 toe. Een korte vertaling kost minimaal 10 credits per taal." },
  "Do unused credits carry over?": { q: "Blijven ongebruikte credits geldig?", a: "Ja. Credits vervallen nooit: credits uit een abonnement of een creditpakket blijven in je workspace, ook nadat je een abonnement opzegt. Je account verwijderen laat ze vervallen. De 30 gratis credits zijn de enige uitzondering: die vervallen 30 dagen na toekenning." },
  "Can I cancel?": { q: "Kan ik opzeggen?", a: "Ja, altijd, via Billing. Je plan blijft actief tot het einde van de periode die je hebt betaald." },
  "Where are my files stored?": { q: "Waar staan mijn bestanden?", a: "In onze privéopslag. Links naar je video's worden per aanvraag ondertekend en verlopen; niets is openbaar tenzij je het bestand zelf deelt." },
};

export function faqFor(locale: Locale, items: FaqItem[]): FaqItem[] {
  if (locale === "en") return items;
  return items.map((f) => {
    const nl = faqNl[f.q];
    if (!nl) return f;
    return { q: nl.q, a: !config.features.ads && nl.translateOnly ? nl.translateOnly : nl.a };
  });
}
