# Design-analyse: MakeUGC en Creatify als referentie

Datum: 18 oktober 2026. Bekeken in Chrome, ingelogd als Tijs. Screenshots staan in `docs/references/`.

## Wat wel en niet bekeken kon worden

| Site | Bekeken | Niet bekeken en waarom |
|---|---|---|
| MakeUGC | Homepage, Features-menu, feature-pagina "Talking Actors", pricing-pagina in de app | Dashboard, creatiescherm, voortgang. De app stuurt het account direct naar een betaalpagina (geen actief abonnement). Daar is niets aangeklikt. |
| Creatify | App: Ad Agent-startscherm, Projects (leeg), Apps-overzicht, klassiek URL-to-Video-invoerscherm. Marketing: `features/url-to-video` | Voortgangs- en resultaatscherm. Die verschijnen pas na het genereren van een video, en dat kost credits. De marketing-homepage stuurt ingelogde gebruikers direct de app in. |

Alles hieronder is gebaseerd op wat zichtbaar was. Waar ik iets niet gezien heb, staat dat erbij.

---

## MakeUGC

Screenshots: `makeugc-01` t/m `makeugc-07`.

**Lay-out.** Gecentreerde content van ongeveer 1000px breed. Secties wisselen wit en heel licht grijs af. Veel witruimte: ruim 100px boven en onder elke sectie. Een vaste bovenbalk met logo links, menu in het midden, "Log in" en een zwarte "Sign up"-knop rechts. Geen sidebar op de marketingsite. De app zelf was niet zichtbaar.

**Sidebar.** Niet gezien. De pricing-pagina in de app heeft alleen een kale bovenbalk met e-mailadres en "Log out".

**Kaarten.** Het sterkste element van de site. Witte kaarten met een 1px lichtgrijze rand, grote afronding (ongeveer 16 tot 20px) en een nauwelijks zichtbare schaduw. Binnenin een genummerde zwarte cirkel met een titel ("1 Pick your actor"), daaronder een lichtgrijs ingesprongen paneel dat een mini-versie van de UI toont, en onderaan een grijze toelichting. Drie kaarten naast elkaar vormen samen "how it works". Op de feature-pagina staan ook kleinere kaarten met titel, tekst en een monospace-citaat in een grijs blok.

**Typografie.** Vette grotesk-koppen met strakke letterspatiëring, in twee regels, met één zinsdeel in een blauw-naar-paars verloop. Bodytekst grijs. Kleine labels (zoals "How it works") als lichtblauwe pil met donkerblauwe tekst. Hiërarchie is duidelijk: één kop, één subregel, één knop.

**Spacing.** Ruim en consequent. Kaarten in een grid van drie met zo'n 24px tussenruimte. Binnen kaarten ongeveer 24px padding.

**Kleurgebruik.** Bijna monochroom: zwart, wit, grijs. Eén accent in blauw-violet voor labels en verlopen. Groen alleen voor een "ON"-status. Een blauwe promobalk bovenaan valt daar buiten.

**Hoofdactie.** Een zwarte pil-knop met pijl ("Get started →"), gecentreerd onder de kop, en herhaald na elke sectie. De zwarte kleur is de enige echt donkere vlek op de pagina, dus hij valt direct op.

**Voortgang.** Geen echte voortgangs-UI gezien. De metafoor is de rij van drie genummerde stappen. Status wordt in de mini-UI getoond als korte labels ("Captions ON" in groen). Videotegels zijn 9:16, afgerond, met een chip linksboven ("AI GENERATED") en een ronde play-knop rechtsonder.

---

## Creatify

Screenshots: `creatify-01` t/m `creatify-08`.

**Lay-out (app).** Donker thema. Links een smalle iconenrail van ongeveer 75px met label onder elk icoon (Ad Agent, Apps, Projects, My Brand, Studio, MCP). Daarnaast een tweede paneel van ongeveer 230px met context voor de actieve sectie (bij Ad Agent: nieuwe chat, zoeken, projecten, chats). Beide panelen zitten in één afgerond kader met een rand. Rechtsboven een paarse "Upgrade"-pil met het aantal credits. Het startscherm is een AI-chatprompt.

**Lay-out (marketing).** Gecentreerd, breed (ongeveer 1100px). Hero met een warm oranje-naar-roze verloop. Daaronder witte secties met kaarten.

**Sidebar.** De tweedeling rail plus contextpaneel werkt voor een app met veel modules. Voor vier pagina's is dat te zwaar.

**Kaarten.** In de app: Projects-pagina met een werkbalk (zoekveld, filters "All type / All status / All time", knop "Add new", grid-of-lijst-schakelaar) en een lege staat met illustratie, titel "No projects yet" en één regel uitleg. Apps-pagina: grote carrouselkaarten boven, daaronder filterchips en een lijst van vier kolommen met icoon, naam en één regel beschrijving. Marketing: witte kaarten met grote afronding, zachte schaduw, een violet icoonvierkant met een klein hoofdletterlabel ("EXPENSIVE"), een kop en grijze tekst.

**Typografie.** Vette grotesk-koppen. Opvallend: kleine labels en pillen in monospace hoofdletters ("HOW IT WORKS", "TRY IT FREE", "LOG IN"). Dat geeft een technische, moderne toets. Bodytekst grijs.

**Spacing.** Ruim op marketing. In de app compacter, met een werkbalk direct onder de paginatitel.

**Kleurgebruik.** App: zwart met grijstinten, violet als enige accent (knoppen, actieve staat, credits-pil). Marketing: warm verloop in de hero, verder wit, met violet voor labels en iconen. Zwarte knop met een violet icoonblok als hoofdknop.

**Hoofdactie.** Op het klassieke URL-to-Video-scherm staat één groot gecentreerd invoerveld ("Share your product link to generate a video"), met daaronder twee knoppen: grijs "Choose existing product" en violet "Analyze URL", plus een tekstlink "add product manually". Eén invoer eerst, de rest later. Op de Projects-pagina is "Add new" de duidelijke knop in de werkbalk.

**Voortgang.** Niet gezien in de app. De marketingpagina toont stappen als een accordeon ("Step 1. Paste Your Product URL", "Step 2. Choose Your AI Avatar", "Step 3. Generate & Customize") met rechts een voorbeeldpaneel. De statusfilter op Projects bevestigt dat elk project een status heeft.

---

## Vergelijking in één oogopslag

| Aspect | MakeUGC | Creatify | Keuze voor ons |
|---|---|---|---|
| Thema | Licht, kalm | Donker in app, warm op marketing | Licht. Onze gebruiker wil snel een video, geen studio. |
| Navigatie | Bovenbalk (app niet gezien) | Iconenrail + contextpaneel | Eén sidebar van 240px met icoon en label. Vier items rechtvaardigen geen tweedeling. |
| Stappen | Drie genummerde kaarten naast elkaar | Accordeon met voorbeeldpaneel | Kaarten. Alle drie de stappen zijn tegelijk zichtbaar, en dat is precies wat voortgang vereist. |
| Creatieflow | Formulier in kaarten | Eén groot invoerveld eerst | Eén grote invoer eerst (productafbeeldingen of URL), daarna de details. |
| Projectenlijst | Niet gezien | Werkbalk met statusfilter, grid/lijst, lege staat | Statusfilter en lege staat overnemen. Grid/lijst-schakelaar niet, dat is extra. |
| Videotegel | 9:16, chip linksboven, play rechtsonder | 9:16 thumbnails in een rij | 9:16 met statusbadge linksboven en play rechtsonder. |
| Hoofdknop | Zwarte pil, herhaald | Violet of zwart met icoonblok | Eén warme accentknop voor "Create new video", zwart voor alle andere primaire acties. |
| Accent | Blauw-violet | Violet | Coral. Beide concurrenten zitten op violet, dus een warme kleur onderscheidt ons meteen. |
| Micro-labels | Lichtblauwe pil | Monospace hoofdletters | Monospace hoofdletters voor stapnummers en de demo-badge. Geist Mono hebben we al. |

---

## Herzien voorstel (v2): premium, licht, MakeUGC-stijl

Het eerste voorstel veranderde te weinig. Dit plan zet de app visueel een niveau hoger, in de lichte stijl van `makeugc-02`, `makeugc-06` en `makeugc-07`: veel lucht, grote strakke koppen, zachte witte vlakken met gelaagde schaduwen, genummerde stapkaarten als handtekening en videotegels als blikvanger. Geen logo's of exacte visuals; alleen patronen.

Per onderdeel staat wat er nu is en wat het wordt.

### 1. Fundament: tokens en typografie

| Wat | Nu | Nieuw | Waarom |
|---|---|---|---|
| Kaartafronding `radius-card` | 12px | **20px** | MakeUGC-kaarten zijn ruim afgerond. 20px leest als "zacht vlak", 12px als "admin-paneel". |
| Tegelafronding | 12px | **16px** (nieuw token `radius-tile`) | Tegels zijn kleiner dan kaarten en krijgen iets minder afronding, anders ogen ze als ballonnen. |
| Knopafronding `radius-control` | 10px | **12px**; de hoofd-CTA wordt een **pil** (volledig rond) | De pil-vorm voor "Create new video" maakt de hoofdactie in één oogopslag herkenbaar, zoals MakeUGC's "Get started". Alle andere knoppen blijven hoekig-afgerond. |
| Kaartrand `border` | `#E7E5E0` overal | Rand wordt lichter: **`#ECEAE4`**; de huidige `#E7E5E0` blijft voor scheidingslijnen (`divider`) | Een zachtere rand laat de schaduw het werk doen. |
| Schaduw | inline 1 laag, nauwelijks zichtbaar | Twee tokens: **`shadow-card`** = `0 1px 2px rgba(17,17,20,.04), 0 12px 32px -16px rgba(17,17,20,.10)` en **`shadow-card-hover`** = `0 2px 4px rgba(17,17,20,.05), 0 20px 40px -16px rgba(17,17,20,.16)` | Gelaagde schaduw (een scherpe en een zachte) is wat kaarten "zwevend" en premium maakt. Eén laag oogt plat. |
| Accentschaduw | geen | **`shadow-accent`** = `0 10px 24px -10px rgba(255,90,54,.55)` | Alleen voor de pil-CTA. Geeft de knop een zachte gloed zonder verloop. |
| Binnenvlak | geen | **`surface-muted`** = `#F4F3EF` | Voor de ingesprongen panelen in stapkaarten en voor placeholders. |
| Koppen | `text-3xl` (30px), `font-semibold`, geen letterspatiëring | **Display 40px / lijnhoogte 1.1 / `font-semibold` / letterspatiëring -0.03em** voor paginatitels; **h2 24px / -0.02em**; **h3 18px** | MakeUGC's koppen zijn groot en strak. Dat is de grootste visuele sprong voor de minste code. |
| Bodytekst | 16px / muted | **Subtitels 17px**, bodytekst 15px, meta 13px | Een iets groter subkopje onder de titel en iets kleinere meta-tekst vergroot het contrast tussen niveaus. |
| Micro-labels | geen | **Geist Mono, 11px, hoofdletters, letterspatiëring 0.08em** als utility `label-mono` | Voor "STEP 1", "VMAKE", "DEMO MODE". Creatify-patroon; Geist Mono zit al in het project. |
| Witruimte | content-padding 40px, sectie-afstand 40px, max-breedte 1152px | **Padding 56px boven, 48px zijkant; sectie-afstand 64px; max-breedte 1120px** | Meer lucht rond elk blok. De content wordt niet breder, de ruimte eromheen wel. |

Alle kleuren blijven tokens in `globals.css`; componenten krijgen geen hex-waarden.

### 2. App shell

| Wat | Nu | Nieuw |
|---|---|---|
| Sidebar-achtergrond | wit met 1px rand rechts | **Zelfde kleur als de pagina (`bg`), zonder rand.** De sidebar wordt deel van de achtergrond; alleen de content-kaarten zijn wit. Dat is het MakeUGC-gevoel: licht vlak, witte eilanden. |
| Sidebar-breedte en padding | 240px, 16px | **264px, 24px** |
| Merk | 32px zwart vierkant met letter + naam | Blijft, maar naam in `-0.02em` en 17px. (Tijdelijk; geen logo.) |
| CTA "Create new video" | accentknop, 40px hoog, hoekig | **Pil, 44px hoog, `shadow-accent`, plus-icoon.** Bij hover iets donkerder en 1px omhoog. |
| Navigatie-items | tekstregel, actieve staat = lichtgrijs vlak | **Actieve staat = wit vlak met `radius-control` en `shadow-card`** (een mini-kaart). Inactief: muted tekst, bij hover ink. Hoogte 40px, iconen 18px. |
| Voetregel | "Vmake · HeyGen · VEED" | Blijft, in `label-mono`. |
| Demo-label | amber balk over de volle breedte bovenaan | **Compacte pil rechtsboven in een vaste topregel** van de content: amber, `label-mono`, tekst "DEMO MODE", met tooltip "Simulated data, no real videos". Altijd zichtbaar op elke pagina (regel 3), maar niet langer een waarschuwingsbalk die de pagina goedkoop maakt. |
| Topregel | geen | **Nieuwe regel van 56px** boven de content: links leeg (later broodkruimel), rechts de demo-pil en later de accountpil. |
| Mobiel | sidebar verdwijnt | Blijft voor nu (fase 5). |

### 3. Dashboard

| Wat | Nu | Nieuw |
|---|---|---|
| Kop | "Welcome back" 30px + grijze regel + knop rechts | **Display-kop 40px**, daaronder subtitel 17px (max 36 tekens per regel breed), **CTA-pil 48px** rechts uitgelijnd. Verticale ruimte onder de kop: 64px. |
| Sectiekop | "Recent projects" 18px + "View all" | **h2 24px** met daarnaast in muted het aantal ("4 of 5"), rechts "View all →" als tekstlink in ink. |
| Grid | 4 tegels per rij vanaf `lg`, gap 20px | **3 tegels per rij vanaf `lg`, 4 vanaf `xl`, gap 28px.** Grotere tegels zijn de blikvanger; vier smalle tegels ogen als een galerij-miniatuur. |
| Nieuw blok: "Now processing" | bestaat niet | Als er een project in verwerking is, verschijnt **boven het grid één brede witte kaart** met links de projectnaam en status, rechts **de drie genummerde stappen in miniatuur** (cirkel + naam + statuschip). Dit zet het handtekening-element al op het dashboard en toont waar de app voor is. Klikbaar naar de projectpagina. Als niets verwerkt wordt, verschijnt het blok niet. |
| Lege staat | gestippelde rand, icoon, tekst, knop | **Witte kaart met `shadow-card`**, icoon in een `surface-muted` cirkel van 56px, titel 18px, één regel uitleg, CTA-pil. Geen stippellijn meer. |

### 4. Videotegel (`ProjectTile`)

| Wat | Nu | Nieuw |
|---|---|---|
| Vorm | 9:16, 12px afronding, 1px rand, geen schaduw | **9:16, 16px afronding, geen rand, `shadow-card`; bij hover `shadow-card-hover` en 1,5% schaal.** |
| Placeholder | vlak verloop + grote letter in het midden | **Warm verloop van `surface-muted` naar `border`** met een **monogram** (productletter, 56px, ink op 15%) rechtsonder in de hoek, niet in het midden. Zodra echte stills bestaan (fase 7) komt daar de poster. |
| Statusbadge | kleurchip linksboven | **Witte pil linksboven** met `shadow-card`, gekleurde stip + tekst in ink. Leest beter op elke achtergrond dan een gekleurde chip. |
| Play-knop (completed) | ink-cirkel in het midden | **Rechtsonder, 40px, wit met `shadow-card`, ink-driehoek.** Verschijnt altijd bij completed, lichtgrijs-transparant bij andere statussen. |
| Onderrand (completed) | geen | **Zachte donkere gradiënt onderin de tegel** (ink 0 → 55%) met daarin in wit: projectnaam en de gesimuleerde duur ("0:24"). Dit is het "video-ad"-gevoel uit `makeugc-01`. In demo-modus staat de duur als placeholder. |
| Meta onder de tegel | naam 14px + product/datum 12px | **Naam 15px semibold, daaronder product · datum 13px muted.** Afstand tot tegel 14px. |

### 5. Genummerde stapkaart (`StepCard`, nieuw component)

Het herkenbare element van de app. Nu bestaat het niet; het wordt de bouwsteen van de projectpagina en, in miniatuur, van het dashboard-blok.

| Onderdeel | Specificatie |
|---|---|
| Kaart | wit, `radius-card` 20px, `shadow-card`, padding 28px |
| Kop | **ink-cirkel 36px met nummer** (wit, 15px semibold) + titel 18px semibold ("Product video"). Rechts een statuschip. |
| Dienstlabel | onder de titel in `label-mono`: "VMAKE" / "HEYGEN" / "VEED" |
| Binnenpaneel | `surface-muted`, 14px afronding, padding 20px. Inhoud per status: Waiting: "Starts after …" in muted. Processing: pulserende stip + "Generating…" + elapsed time. Completed: 9:16-miniatuur (placeholder) + "Done in 4 min". Failed: korte foutzin + knop "Retry". |
| Toelichting | onderaan, 14px muted, in gewone taal: "Turns your product photos into a short product clip." |
| Actieve staat | **cirkel en statuschip in accent**, kaartrand 1px accent op 40% |
| Voltooid | cirkel wordt **success-groen met vinkje** |
| Mislukt | cirkel **danger-rood met kruis** |
| Lay-out op projectpagina | stap 1 en 2 naast elkaar, stap 3 eronder over de volle breedte, met een dunne verbindingslijn in `divider` ertussen |

### 6. Knoppen en badges

| Wat | Nu | Nieuw |
|---|---|---|
| `Button` primary (ink) | 40px, 10px radius | 40/44/48px, **12px radius**, bij hover ink 90% en 1px omhoog, bij active terug |
| `Button` accent | als primary maar oranje | **Pil + `shadow-accent`.** Alleen voor "Create new video" en "Generate video". |
| `Button` secondary | wit + rand | wit + rand `border` + `shadow-card` licht |
| `Badge` | gekleurde chip, 12px tekst | Twee varianten: **tinted** (zoals nu, voor in kaarten) en **floating** (wit + schaduw, voor over beeld) |

### 7. Wat bewust niet verandert

- Kleurenpalet: ink, bg, surface, muted, accent, success, warning, danger blijven exact. Coral blijft het enige accent.
- Vijf pagina's, vier navigatie-items, mock-data in `src/lib/mock/`.
- Geen verlooptekst, geen promobalken, geen donker thema, geen illustraties van derden.

### 8. Volgorde van uitvoering na akkoord

1. **Fundament** (`globals.css`, `Button`, `Card`, `Badge`): tokens, radius, schaduwen, typografie, `label-mono`.
2. **App shell** (`AppShell`, `Sidebar`, `DemoModeBadge`): sidebar op `bg`, witte actieve staat, pil-CTA, topregel met demo-pil.
3. **Videotegel** (`ProjectTile`): nieuwe placeholder, floating badge, play-knop rechtsonder, onderrand.
4. **StepCard** (nieuw) plus **"Now processing"-blok** op het dashboard.
5. **Dashboard** (`dashboard/page.tsx`): display-kop, grotere grid, nieuwe lege staat.

Dat is één commit met een screenshot ervoor en erna. Projectpagina, New video en Projects volgen daarna in de volgende stappen van fase 4, met deze bouwstenen.
