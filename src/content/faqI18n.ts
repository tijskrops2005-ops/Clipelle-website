import type { FaqItem } from "./faq";
import type { Locale } from "@/lib/i18n";

/**
 * Dutch versions of the FAQ entries, keyed by the English question. An entry without a Dutch
 * version falls back to English (and shows as such), so a new question never breaks the Dutch page.
 */
export const faqNl: Record<string, FaqItem> = {
  "What do I need to start?": { q: "Wat heb ik nodig om te beginnen?", a: "Eén productfoto en twee of drie zinnen over het product. Het script, de presentator en de montage worden voor je gemaakt. Voor een vertaling upload je een video van jezelf." },
  "Can I use my own script?": { q: "Kan ik mijn eigen script gebruiken?", a: "Ja. Plak het in het scriptveld, of vink \"Review script first\" aan om het geschreven script te lezen en goed te keuren voordat de rest start." },
  "What is placed on screen?": { q: "Wat komt er in beeld?", a: "Alleen ondertitels van wat de presentator zegt, in de ondertitelstijl die jij kiest, plus je logo als je dat toevoegt. Geen tekstkaarten, geen knoppen, geen eindkaarten." },
  "Which videos can I translate?": { q: "Welke video's kan ik vertalen?", a: "Video's van jezelf, met toestemming van de spreker om stem en gezicht te gebruiken. Dat bevestig je vóór elke vertaling." },
  "How long does it take?": { q: "Hoe lang duurt het?", a: "Een gemiddelde advertentie of vertaling is binnen enkele minuten klaar. Je kunt de pagina verlaten; de voortgang loopt door en de afgeronde video verschijnt op je dashboard." },
  "Can I use a product page link instead of uploading photos?": { q: "Kan ik een productpagina-link gebruiken in plaats van foto's uploaden?", a: "Ja. Van link naar video leest naam, omschrijving en foto's van een openbare productpagina. Jij controleert en past aan, vinkt de foto's aan die van jou zijn, en het normale advertentieformulier opent ingevuld." },
  "Is there an API?": { q: "Is er een API?", a: "Ja. Op een plan met credits maak je sleutels aan onder Settings → API keys en maak je advertenties en vertalingen vanuit je eigen code, met dezelfde credits en limieten als het formulier. Er is ook een MCP-server voor AI-assistenten." },
  "Can I delete my data?": { q: "Kan ik mijn gegevens verwijderen?", a: "Een project verwijderen verwijdert de bestanden. Je account verwijderen in Settings verwijdert je projecten, bestanden, credits en profiel; dat kan niet ongedaan worden gemaakt." },
  "Which languages can an ad be spoken in?": { q: "In welke talen kan een advertentie worden ingesproken?", a: "De talen met presentatorstemmen, zoals het formulier ze toont. Vertalingen van een bestaande video ondersteunen 190 talen en regionale varianten." },
  "Who owns the videos?": { q: "Van wie zijn de video's?", a: "Van jou. Reelay maakt ze voor je uit jouw product en jouw invoer; gebruik ze waar je wilt. Voor vertalingen bevestig je eerst dat de bronvideo van jou is en dat je de toestemming van de spreker hebt." },
  "What does a video cost?": { q: "Wat kost een video?", a: "Elk plan bevat credits. Het formulier toont de credits en de schatting voor jouw keuzes voordat je begint, en de projectpagina toont achteraf wat er echt is gebruikt." },
  "What is a credit?": { q: "Wat is een credit?", a: "Eén credit is één seconde presentatorvideo in Standard-kwaliteit. Premium-kwaliteit, productbeelden en vertalingen worden in dezelfde eenheid uitgedrukt, zodat één getal zegt wat een video kost." },
  "Do unused credits carry over?": { q: "Blijven ongebruikte credits geldig?", a: "Ja. Credits vervallen nooit: credits uit een abonnement of een creditpakket blijven op je account staan zolang het bestaat, ook nadat je een abonnement opzegt. Je account verwijderen laat ze vervallen. De gratis eerste advertentie is de enige uitzondering: die vervalt 30 dagen na toekenning." },
  "Can I cancel?": { q: "Kan ik opzeggen?", a: "Ja, altijd, via Billing. Je plan blijft actief tot het einde van de periode die je hebt betaald." },
};

export function faqFor(locale: Locale, items: FaqItem[]): FaqItem[] {
  if (locale === "en") return items;
  return items.map((f) => faqNl[f.q] ?? f);
}
