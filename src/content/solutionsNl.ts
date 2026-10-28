import type { Solution } from "./solutions";
import { config } from "@/lib/config";

/** Dutch use-case pages, same shape and the same real features as the English ones; keyed by slug. */
const solutionsNlWithAds: Record<string, Solution> = {
  "ecommerce-brands": {
    slug: "ecommerce-brands", eyebrow: "E-commercemerken", title: "Een vaste stroom productadvertenties zonder studiodag",
    intro: "Een winkel met een catalogus heeft elke week een nieuwe advertentie nodig, voor producten die veranderen. Clipelle maakt van één productfoto en een paar zinnen een afgeronde 9:16-advertentie met presentator en ondertitels, tegen kosten die je vooraf ziet.",
    problem: { title: "Het probleem", points: ["Een shoot kost een dag en dekt een handvol producten; de catalogus heeft er honderden.", "Elke advertentie heeft een script, beelden, een presentator, een montage en ondertitels nodig, in die volgorde, in verschillende tools.", "Kosten zijn pas bekend bij de factuur."] },
    helps: [
      { title: "Eén formulier per product", text: "Foto, naam, twee zinnen, lengte. Het script wordt geschreven, de productclip gegenereerd, de presentator spreekt, de montage wordt gemaakt met ondertitels." },
      { title: "Merkstandaarden", text: "Accentkleur, ondertitelstijl, lettertype en logo één keer opgeslagen in Settings en toegepast op elke nieuwe advertentie." },
      { title: "Kosten voordat je klikt", text: "Het formulier toont de credits voor jouw keuzes; de projectpagina toont achteraf de werkelijk gebruikte credits." },
      { title: "Een productpagina-link", text: "Van link naar video leest naam, omschrijving en foto's van je productpagina, zodat het formulier ingevuld begint." },
      { title: "Vanuit je eigen code", text: "De API maakt dezelfde advertenties uit een productfeed of een synchronisatie, met dezelfde credits en limieten." },
    ],
    example: { title: "Een nieuw product, maandag de advertentie klaar", stepTitles: ["Plak de productpagina", "Kies lengte en stem", "Kies de hook", "Download"], steps: ["Maandag: plak de productpagina van de nieuwe binnenkomer in van link naar video; controleer de omschrijving, vink twee foto's aan.", "Kies 30 seconden, Standard, de merkstem; vink Review script first aan.", "Kies een van de drie hooks, keur goed; de clip, de presentator en de montage lopen vanzelf.", "Download de 9:16-advertentie van de projectpagina; het werkelijke bedrag staat naast de schatting."] },
    faq: [
      { q: "Kan ik één presentator voor elke advertentie houden?", a: "Ja. Kies op elk formulier dezelfde presentator en stem, of maak één keuze en hergebruik die via de API." },
      { q: "En meerdere producten in één advertentie?", a: "Een advertentie draait om één product en één productclip. Maak één advertentie per product; dat houdt elke advertentie helder." },
      { q: "Moet ik iets schrijven?", a: "Twee of drie feitelijke zinnen. Het script wordt daaruit geschreven; je kunt het bekijken voordat er iets wordt betaald, of je eigen script plakken." },
    ],
  },
  "shopify-stores": {
    slug: "shopify-stores", eyebrow: "Shopify-winkels", title: "Van productpagina naar advertentie, link voor link",
    intro: "De meeste productpagina's hebben al wat een advertentie nodig heeft: een naam, een omschrijving en goede foto's. Clipelle leest een openbare productpagina, laat je controleren en corrigeren wat het vond, en maakt daarna de advertentie.",
    problem: { title: "Het probleem", points: ["Productgegevens staan op de pagina; ze overtypen in een advertentietool is traag en foutgevoelig.", "De foto's zijn al gemaakt; wat ontbreekt is beweging, een stem en ondertitels.", "Een nieuwe advertentie per product, per week, past niet in een handmatig proces."] },
    helps: [
      { title: "Van link naar video", text: "Plak de productlink. Naam, omschrijving, foto's en prijs worden uit de productgegevens van de pagina gelezen; jij controleert en past aan voordat er iets wordt gebruikt." },
      { title: "Alleen de foto's die je aanvinkt", text: "Foto's worden pas gekopieerd nadat je bevestigt; gebruik producten en foto's waarvan je de rechten hebt." },
      { title: "Hetzelfde advertentieformulier", text: "Lengte, presentator, stem, toon, aanbieding en merkstijl, precies zoals met een geüploade foto." },
      { title: "Automatiseren via de API", text: "Maak advertenties vanuit je eigen scripts of tools met een API-sleutel; een project per product, idempotent bij herhaling." },
    ],
    example: { title: "Van productpagina naar advertentie in vier stappen", stepTitles: ["Plak de link", "Controleer de feiten", "Voeg de aanbieding toe", "Plaats hem"], steps: ["Plak de link van de productpagina; het formulier toont de naam, omschrijving en zes foto's van de pagina.", "Kort de omschrijving in tot de feiten; vink de drie foto's aan die van jou zijn.", "Voeg de aanbiedingsregel van deze week toe; genereer.", "Download de afgeronde 9:16-advertentie; plaats hem op TikTok, Reels of Shorts."] },
    faq: [
      { q: "Werkt het met elk winkelplatform?", a: "Het werkt met elke openbare productpagina met productgegevens, deeltags of ten minste een titel en foto's. Pagina's achter een login kunnen niet worden gelezen." },
      { q: "Is er een Shopify-app?", a: "Nog niet. Vandaag plak je een link, of gebruik je de API vanuit je eigen code." },
      { q: "Gaat de pagina naar een AI?", a: "Nee. De pagina wordt door gewone code gelezen; het script wordt later geschreven uit de omschrijving die jij goedkeurde." },
    ],
  },
  dropshipping: {
    slug: "dropshipping", eyebrow: "Dropshipping", title: "Test een product met een video voordat je voorraad inkoopt",
    intro: "Als je producten snel test, is een video per kandidaat het knelpunt. Clipelle maakt een korte advertentie van de productfoto die je al hebt, zodat de test kan starten vóór de eerste bestelling.",
    problem: { title: "Het probleem", points: ["Een test heeft een video nodig, en het product is nog niet in je handen.", "Tientallen kandidaten per maand passen niet in een shoot of bij een editor.", "Uitgaven aan creatives moeten voorspelbaar blijven zolang het product onbewezen is."] },
    helps: [
      { title: "Een advertentie uit de foto die je hebt", text: "Eén duidelijke productfoto wordt een productclip met langzame camerabewegingen; een presentator spreekt de pitch; ondertitels maken hem leesbaar zonder geluid." },
      { title: "Korte lengtes", text: "10 of 20 seconden houden een eerste test goedkoop; 30 seconden als het product een volledig verhaal verdient." },
      { title: "Kleine variaties", text: "Hetzelfde product, een andere hook of toon: bekijk het script, kies een andere hook, genereer opnieuw." },
      { title: "Kosten die je kunt plannen", text: "Credits per lengte staan vast en worden getoond voordat je begint; het werkelijke bedrag zie je achteraf." },
    ],
    example: { title: "Een producttest in vier stappen", stepTitles: ["Upload de foto", "Houd het kort", "Keur de hook goed", "Schaal op wat werkt"], steps: ["Upload de productfoto van de leverancier waarvan je de rechten hebt; schrijf drie feitelijke zinnen.", "Kies 20 seconden, Standard, een directe toon; vink Review script first aan.", "Keur een hook goed die het probleem benoemt dat het product oplost.", "Draai de advertentie; als hij de aandacht vasthoudt, maak je de versie van 30 seconden met de aanbiedingsregel."] },
    faq: [
      { q: "Kan ik foto's van de leverancier gebruiken?", a: "Alleen foto's waarvan je de rechten hebt. Het formulier vraagt je dat te bevestigen." },
      { q: "Hoe snel is een video klaar?", a: "Meestal binnen enkele minuten; je kunt de pagina verlaten en de afgeronde video verschijnt op je dashboard." },
      { q: "Plaatst Clipelle de advertenties?", a: "Nee. Clipelle maakt de video; de campagne draai jij in je advertentieplatform." },
    ],
  },
  agencies: {
    slug: "agencies", eyebrow: "Bureaus", title: "Veel merken, één proces, kosten vooraf bekend",
    intro: "Een bureau draait hetzelfde productieproces voor elke klant, met andere invoer. Clipelle houdt dat proces vast en toont de kosten van elke video voordat hij start, zodat offreren en leveren eenvoudig blijven.",
    problem: { title: "Het probleem", points: ["Elke klantadvertentie doorloopt dezelfde stappen, met de hand, in meerdere tools.", "Merkconsistentie per klant vraagt discipline van het hele team.", "Klanten willen de kosten vooraf weten, niet achteraf."] },
    helps: [
      { title: "Een vast proces", text: "Script, productclip, presentator, montage, altijd in die volgorde, met dezelfde kwaliteitscontroles." },
      { title: "Merkstijl per video", text: "Accentkleur, ondertitelstijl, lettertype en logo per advertentie; de standaarden van een klant kunnen in de workspace voor die klant worden opgeslagen." },
      { title: "Schattingen op elk formulier", text: "Credits voordat je klikt; de werkelijk gebruikte credits op de projectpagina voor je eigen administratie." },
      { title: "De API voor volume", text: "Maak advertenties en vertalingen vanuit je eigen tooling met een API-sleutel; projecten blijven per workspace." },
      { title: "Vertalingen voor internationale klanten", text: "De video van een klant in meerdere talen met de eigen stem van de spreker, elke versie met ondertitels." },
    ],
    example: { title: "Eén klantadvertentie, drie talen", stepTitles: ["Begin bij de productpagina", "Pas het merk van de klant toe", "Laat de klant kiezen", "Lever in drie talen"], steps: ["Ontvang de productsheet van een klant; plak de productpagina in van link naar video.", "Pas de kleur, ondertitelstijl en het logo van de klant toe in het blok merkstijl.", "Vink Review script first aan; stuur de drie hooks naar de klant, keur de gekozen goed.", "Lever de 9:16-advertentie en de Duitse en Franse versies uit de vertaalstroom."] },
    faq: [
      { q: "Kunnen meerdere mensen in één account werken?", a: "Ja. Een teamworkspace deelt projecten en credits; de eigenaar beheert plan, credits en leden. Eén teamworkspace per klant of per bureau is de praktische opzet." },
      { q: "Kunnen we Clipelle white-labelen?", a: "Nee. De afgeronde video's dragen geen Clipelle-merk; de app zelf is Clipelle." },
      { q: "Hoe factureren we klanten?", a: "De projectpagina toont het werkelijke bedrag per video; de pagina Usage toont de uitgaven per project voor je eigen facturatie." },
    ],
  },
  "apps-and-saas": {
    slug: "apps-and-saas", eyebrow: "Apps en SaaS", title: "Leg een functie uit in een verticale video met presentator",
    intro: "Een functie uitgelegd in 30 gesproken seconden, met een schermafbeelding als productbeeld, doet het goed op verticale platforms. Clipelle maakt die video uit één afbeelding en een korte omschrijving.",
    problem: { title: "Het probleem", points: ["Schermopnames zijn lang en hebben een stem, ondertitels en een montage nodig.", "Een presentator voor de camera kost een shoot; een slidedeck houdt de aandacht niet vast.", "Elke functielancering heeft dezelfde video opnieuw nodig."] },
    helps: [
      { title: "Een schermafbeelding als product", text: "Upload een schone schermafbeelding of app-visual; die wordt de productclip met langzame camerabewegingen terwijl de presentator uitlegt." },
      { title: "Een gesproken script binnen een limiet", text: "Hook, het probleem dat de functie oplost, wat ze doet, de oproep tot actie, in ongeveer 75 woorden voor 30 seconden." },
      { title: "Ondertitels voor kijken zonder geluid", text: "Alles wat de presentator zegt staat in beeld als ondertitel; je accentkleur markeert het gesproken woord." },
      { title: "Talen", text: "Maak de advertentie in een andere taal, of vertaal de afgeronde video met dezelfde stem." },
    ],
    example: { title: "Een functielancering in vier stappen", stepTitles: ["Upload een schermafbeelding", "Kies toon en presentator", "Bekijk het script", "Download en vertaal"], steps: ["Upload één schermafbeelding van het nieuwe dashboard; omschrijf wat het doet en voor wie.", "Kies 30 seconden, een warme toon, de presentator die bij het merk past.", "Bekijk het script; houd de hook die het pijnpunt benoemt.", "Download de advertentie; vertaal hem naar het Spaans voor de Latijns-Amerikaanse lancering."] },
    faq: [
      { q: "Kan de productclip een schermopname tonen?", a: "De productclip wordt gegenereerd uit één stilstaand beeld. Gebruik een schone schermafbeelding; een opname is vandaag geen invoer." },
      { q: "Kan de presentator technische termen zeggen?", a: "Ja; zet ze in de omschrijving of je eigen script. Voeg ze bij vertalingen toe als te behouden termen." },
      { q: "Is er een eindkaart met een knop?", a: "Nee. De enige tekst in beeld zijn de ondertitels; de oproep tot actie wordt gesproken." },
    ],
  },
  "creators-and-localization": {
    slug: "creators-and-localization", eyebrow: "Creators en lokalisatie", title: "Eén video, veel talen, je eigen stem",
    intro: "De video van een creator werkt in één taal; het publiek spreekt er tien. Clipelle vertaalt een video van jezelf naar andere talen met je eigen stem en kloppende lippen, en brandt voor elke taal ondertitels in.",
    problem: { title: "Het probleem", points: ["Opnieuw opnemen in elke taal is onmogelijk; alleen ondertitels verliezen de verbinding.", "Nasynchroniseren met een andere stem verandert wie er spreekt.", "Elke versie heeft eigen ondertitels nodig en een controle van namen en getallen."] },
    helps: [
      { title: "Jouw stem, andere woorden", text: "De vertaling behoudt de eigen stem van de spreker en laat de lippen de nieuwe taal volgen, in Speed- of Precision-kwaliteit." },
      { title: "190 talen en varianten", text: "Meerdere tegelijk; elke versie wordt parallel gemaakt en krijgt eigen ondertitels." },
      { title: "Een automatische controle per regel", text: "Elke vertaalde regel wordt vergeleken met het origineel op ontbrekende of toegevoegde woorden, betekenis, getallen en namen, en binnen de timing gecorrigeerd." },
      { title: "Termen om te behouden", text: "Je naam, je productnamen en je vaste uitspraken blijven zoals ze zijn." },
      { title: "Rechten eerst", text: "Je bevestigt dat de video van jou is en dat je de toestemming van de spreker hebt voordat er iets start." },
    ],
    example: { title: "Eén video naar drie talen", stepTitles: ["Upload de video", "Kies drie talen", "Controleer de correcties", "Download drie versies"], steps: ["Upload de video van 60 seconden; laat de gesproken taal op Automatisch herkennen staan.", "Kies Duits, Frans en Portugees (Brazilië); houd Speed; voeg de kanaalnaam toe aan de te behouden termen.", "De kwaliteitscontrole toont twee gecorrigeerde regels en één waarschuwing over een getal; controleer ze.", "Download drie video's, elk met ondertitels, klaar voor de regionale kanalen."] },
    faq: [
      { q: "Blijft mijn accent behouden?", a: "De stem blijft de jouwe; de uitspraak volgt de nieuwe taal. Beluister het resultaat en pas de te behouden termen aan als een naam vreemd wordt uitgesproken." },
      { q: "Hoe lang mag de video zijn?", a: "Vandaag tot 32 MB en drie minuten per upload." },
      { q: "Kan ik de vertaling bewerken?", a: "De automatische controle corrigeert regels binnen de timing en toont wat er veranderde. Handmatig bewerken per regel hoort niet bij de stroom." },
    ],
  },
};

/** The translation-first pages while ads are off (27 Oct 2026); same slugs as solutions.ts. */
const solutionsNlTranslation: Record<string, Solution> = {
  "ecommerce-brands": {
    slug: "ecommerce-brands", eyebrow: "E-commercemerken", title: "Eén productvideo, in de taal van elke markt waarin je verkoopt",
    intro: "Een winkel die in meerdere landen verkoopt, heeft dezelfde productvideo in meerdere talen nodig. Clipelle vertaalt een video van jezelf met de eigen stem van de spreker en kloppende lippen, controleert elke regel en brandt per taal ondertitels in.",
    problem: { title: "Het probleem", points: ["Een productvideo wordt één keer gemaakt, in één taal; elke andere markt krijgt hooguit ondertitels.", "Opnieuw opnemen per taal kost een shoot per markt.", "Nasynchroniseren met een andere stem verandert wie er spreekt, en namen en getallen schuiven."] },
    helps: [
      { title: "Jouw stem, elke markt", text: "De vertaling behoudt de eigen stem van de spreker en laat de lippen de nieuwe taal volgen, in Speed- of Precision-kwaliteit." },
      { title: "Meerdere talen in één keer", text: "Kies alle markten tegelijk; elke versie wordt parallel gemaakt en krijgt eigen ondertitels." },
      { title: "Merknamen blijven", text: "Zet je merk- en productnamen bij Words to keep en ze worden precies zo uitgesproken." },
      { title: "Elke regel gecontroleerd", text: "Elke vertaalde regel wordt vergeleken met het origineel op ontbrekende woorden, getallen en namen, en vóór de render gecorrigeerd." },
      { title: "Kosten voordat je klikt", text: "Het formulier toont de credits per taal voordat je begint; een versie die mislukt kost niets." },
    ],
    example: { title: "Eén lanceervideo, vier markten", stepTitles: ["Upload de video", "Kies de markten", "Controleer de correcties", "Download vier versies"], steps: ["Upload de lanceervideo van 45 seconden; laat de gesproken taal op Detect automatically.", "Kies Duits, Frans, Spaans en Italiaans; houd Speed; zet de merknaam bij Words to keep.", "De kwaliteitscontrole toont de gecorrigeerde regels per taal; lees ze op de projectpagina.", "Download vier video's met ondertitels, één per winkel, klaar om te plaatsen."] },
    faq: [
      { q: "Blijft de productnaam in elke taal hetzelfde?", a: "Ja, als je hem bij Words to keep zet. De controle markeert ook namen en getallen die veranderden." },
      { q: "Kan ik het originele formaat houden in plaats van 9:16?", a: "Ja. Kies het originele formaat op het formulier; de ondertitels worden op dezelfde manier geplaatst." },
      { q: "Kan ik met een andere stem vertalen?", a: "De eigen stem van de spreker wordt gebruikt. Met Vertalen met een presentator spreekt een AI-presentator de vertaalde regels." },
    ],
  },
  agencies: {
    slug: "agencies", eyebrow: "Bureaus", title: "Veel klanten, één proces, elke video in meerdere talen",
    intro: "Een bureau doorloopt dezelfde lokalisatiestappen voor elke klant. Clipelle houdt dat proces vast, toont de credits per taal voordat een video start, en levert per taal één gecontroleerde versie in de workspace van de klant.",
    problem: { title: "Het probleem", points: ["Elke klantvideo gaat door vertaling, stem, lipsync en ondertitels, met de hand, in meerdere tools.", "Namen, getallen en merktermen vragen een controle per taal.", "Klanten willen de kosten vooraf weten, niet achteraf."] },
    helps: [
      { title: "Een vast proces", text: "Upload, vertaling, stem en lipsync, controle, ondertitels: altijd in die volgorde, met dezelfde kwaliteitscontrole." },
      { title: "Een workspace per klant", text: "Een teamworkspace deelt projecten en credits; één per klant houdt hun video's en verbruik gescheiden." },
      { title: "Credits op elk formulier", text: "De credits per taal voordat je klikt; de projectpagina toont wat elke versie gebruikte." },
      { title: "De API voor volume", text: "Vertaal vanuit je eigen tooling met een API-sleutel; projecten blijven per workspace." },
      { title: "Te behouden woorden per klant", text: "Merknamen en vaste uitspraken blijven zoals ze zijn, per project." },
    ],
    example: { title: "Eén klantvideo, drie talen", stepTitles: ["Upload de video van de klant", "Kies de talen", "Lees de controle", "Lever drie versies"], steps: ["Upload de video van 60 seconden van de klant in hun workspace.", "Kies Duits, Frans en Portugees; zet de merktermen van de klant bij Words to keep.", "Lees de gecorrigeerde regels en waarschuwingen per taal op de projectpagina.", "Deel een kijklink ter goedkeuring en download daarna de drie versies."] },
    faq: [
      { q: "Kunnen meerdere mensen in één account werken?", a: "Ja. Een teamworkspace deelt projecten en credits; de eigenaar beheert plan, credits en leden. Eén teamworkspace per klant of per bureau." },
      { q: "Kunnen we Clipelle white-labelen?", a: "Nee. De afgeronde video's dragen geen Clipelle-merk; de app zelf is Clipelle." },
      { q: "Hoe factureren we klanten?", a: "De projectpagina toont de credits per taalversie; de pagina Usage toont de uitgaven per project voor je eigen facturatie." },
    ],
  },
  "creators-and-localization": solutionsNlWithAds["creators-and-localization"],
};

export const solutionsNl: Record<string, Solution> = config.features.ads ? solutionsNlWithAds : solutionsNlTranslation;

export const solutionFor = (slug: string, locale: "en" | "nl", fallback: Solution | undefined) => (locale === "nl" ? solutionsNl[slug] ?? fallback : fallback);
