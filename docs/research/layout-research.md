# Layout-onderzoek: Creatify en MakeUGC vergeleken met Reelay

Datum: 20 oktober 2026. Doel: leren hoe twee volwassen AI-advertentietools hun navigatie, creatieflow, resultaatpagina en prijzen opbouwen, en daar een concreet layoutvoorstel voor Reelay uit afleiden. Er is **niets gebouwd** en geen code gewijzigd; dit document en de screenshots in `docs/research/screens/` zijn het enige resultaat.

Hoe gelezen:

- Alleen publieke pagina's: marketingsite, helpcenter, API-documentatie, blog. Geen inlog, geen formulieren, geen betaal- of upgradeknoppen.
- Waar de app achter een inlog zit, staat dat erbij; dan is de structuur afgeleid uit help-artikelen, blog-tutorials en de API-parameters (die laten precies zien welke velden en opties de app kent).
- Per onderdeel staat **zeker** (direct op de pagina gezien of in de documentatie gelezen) of **aanname** (afgeleid).
- Teksten, merknamen, kleurcodes, lettertypen en assets zijn niet overgenomen. Patronen zijn in eigen woorden beschreven.

Opmerking over Creatify: de Chrome-browser bleek al ingelogd bij Creatify onder het account van Tijs. `creatify.ai/` stuurde daardoor meteen door naar de app. Die app is volgens de afspraak **niet** bekeken en er is geen screenshot van bewaard; de marketingpagina's (`/features/...`, `/pricing`, `/use-cases`) laadden wel gewoon en zijn gebruikt.

---

## 1. Tien inzichten voor Reelay

1. **Eén invoer eerst, de rest later.** Beide tools beginnen met één ding (een URL, een prompt, een script) en vragen pas daarna om details. Reelay's advertentieformulier toont nu alles tegelijk (foto's, naam, URL, beschrijving, lengte, taal, accent, stem, presentator, achtergrond, merkstijl, aanbod, regie, script). Dat is compleet, maar de eerste indruk is "veel werk". Een flow in twee of drie blokken (Product → Presentator en stijl → Script) met ingeklapte "Optioneel"-secties houdt dezelfde opties en verlaagt de drempel.
2. **Aanbevolen standaard zichtbaar maken.** Creatify's video-instellingen tonen de aanbeveling expliciet (9:16, 30 s, Engels, "aanbevolen voor TikTok/Reels"). Reelay heeft goede standaarden maar noemt ze niet als aanbeveling. Een korte regel "Aanbevolen: 30 s, 9:16, Engels" bij de lengtekeuze geeft vertrouwen en nodigt uit om niets te veranderen.
3. **Kosten vooraf, in één getal, op de plek van de knop.** Beide concurrenten tonen credits bij de knop en herinneren eraan vlak voor de render. Reelay toont de schatting al onder de knop; dat is sterk. Wat ontbreekt: de schatting ook in de bevestigingsstap herhalen en per taalversie (Workflow B) op het resultaat tonen wat het werkelijk kostte, zonder leveranciersnamen.
4. **Resultaten als 9:16-tegels met status erop.** Creatify en MakeUGC tonen klaar werk als verticale tegels met een label en een afspeelknop. Reelay heeft dat al (`ProjectTile`), maar op de projectpagina staat het resultaat onderaan onder de pipeline. Zodra een video klaar is, hoort de video bovenaan te staan en de pipeline ingeklapt eronder.
5. **Varianten zijn het verdienmodel van de concurrent, niet onze MVP.** Creatify rendert standaard 6–8 varianten, MakeUGC 10 in batch. Dat is bewust buiten onze scope (U3 op de roadmap). Wel kunnen we het goedkoop voorbereiden: de drie gesproken hooks die Reelay al schrijft als drie kaarten tonen, met één gekozen hook voor de render. De layout kan later een "Maak alle drie"-knop krijgen zonder herontwerp.
6. **Het editor-escape is overal, maar klein.** Beide tools hebben een "snelle bewerking" (presentator, stem, muziek, captions, formaat wisselen) naast een volledige editor. Reelay bouwt bewust geen editor. Het equivalent dat wél past: "Opnieuw renderen met andere instelling" vanaf de resultaatpagina, die het formulier vooringevuld opent (script, presentator, stem) en alleen de gewijzigde stap opnieuw laat lopen. Dat is retry-logica die we al hebben, met een ander label.
7. **Formaat- en platformkeuze als preset.** Creatify laat eerst het platform kiezen en leidt daar formaat en lengte uit af. Reelay is 9:16-only, en dat is een bewuste keuze. Een klein label "9:16, geschikt voor TikTok, Reels en Shorts" bij de upload legt het uit zonder een keuze toe te voegen.
8. **Een "Mijn merk"-plek hoort apart.** Beide tools hebben Brand Kit / Brand Space (logo, kleuren, lettertype, stemvoorkeur, product). Reelay vraagt merkstijl nu per project opnieuw. Een Settings-tabblad "Merk" dat de laatste merkstijl bewaart en als standaard invult, scheelt het meeste werk per video. Niets nieuws in de pipeline, alleen standaardwaarden.
9. **Projectenlijst filtert op status én soort.** De concurrenten groeperen output per tool. Reelay's projectenlijst filtert op status; met twee workflows is een tweede filter "Advertentie / Vertaling" en een duidelijk soort-label op de tegel genoeg.
10. **Toon: kort, actiegericht, zonder jargon.** Beide tools schrijven koppen als werkwoordzinnen ("Paste a link. Get a video ad.") en noemen geen modellen of leveranciers in de klantflow, behalve MakeUGC dat juist met "15 modellen" adverteert. Reelay zit al op de kalme kant; de teksten op de stappenkaarten mogen korter (één zin wat het doet, geen uitleg hoe).

---

## 2. Creatify (creatify.ai)

### 2.1 Informatie-architectuur

**Hoofdnavigatie** (zeker, `creatify.ai/features/url-to-video`, `/pricing`, `/use-cases`):

```
Platform ▾   Labs   Studio   Resources ▾   Pricing   [Book demo]   [Log in]
```

Het Platform-menu is in drie kolommen gegroepeerd:

- Creation: Creative Agent, Ad Flow, URL to Video, AI Avatar, Model Playground, Image Ad, Ad Clone.
- Intelligence: Performance Agent, Competitor Tracker, AI Ad Library.
- Integrations: API, MCP, Slack-bot, Ad Launcher.

Resources: Blog, Case Studies, Creatify 101 (tutorials), Affiliate, Careers, AI Ethics, About. Use Cases: per advertentiestijl en per soort bedrijf.

**Sitemap** (zeker, `creatify.ai/sitemap_en.xml`): blog 279 pagina's, features 30, tools 101 (kleine losse gereedschappen voor SEO), tool 20, use-cases 20, compare 16 (vergelijkingen met concurrenten), review 25, case-study 18, ai-models 6, studio 3, enterprise 2. De features-URL's die voor ons relevant zijn: url-to-video, ai-avatar, custom-avatar, product-video, batch-mode, ai-video-editor, ai-scriptwriter, talking-photo, image-to-video-ai, ai-shorts, creative-insights, agent, ad-clone, model-playground.

**App-navigatie** (aanname, uit de help-artikelen en de API): een linkerbalk met een chat-ingang (Ad Agent), de losse apps, Projects, My Brand en Studio; bovenin een "Upgrade"-knop met het creditsaldo. De app is niet bekeken.

Footer: vier kolommen (Features, Tools, Use Cases, Company) en een taalkeuze.

### 2.2 Homepage en productpagina

**Homepage** (zeker uit de HTML van `creatify.ai/`; in de browser was de pagina door de inlog niet te zien): hero "AI Ads that win" met een chatachtige promptbalk en drie tabbladen Research / Create / Analyze; daarna blokken "zet elk product om in ads", een raster van advertentieformaten, integraties, publicatiekanalen, brand kit, eigen modellen, logostrip, zes case-studykaarten met één getal per kaart, totaalcijfers (aantal ads, advertentie-uitgaven, gebruikers), een afsluitende promptbalk.

**Feature-pagina URL to Video** (zeker, screenshot `screens/creatify-url-to-video-hero.jpg`): kop als belofte in twee korte zinnen, één invoerveld met een voorbeeldlink, één grote knop, sociale bewijslijn (beoordeling, "geen creditcard nodig"), daarna "hoe het werkt" in drie stappen, lijst van ondersteunde winkels, talen, FAQ.

**Feature-pagina AI Avatar** (zeker, `screens/creatify-ai-avatar-hero.jpg`): aantal avatars als kop, drie instappunten (bibliotheek, foto uploaden, zelf ontwerpen), stemmen en talen, formaten 9:16 / 16:9 / 1:1, achtergronden op hogere plannen, emotietags in het script, creditkosten per 15 of 30 s, maximale lengte per plan, rendertijd 2–5 min.

**Use cases** (zeker, `screens/creatify-use-cases-hero.jpg`, `screens/creatify-use-cases-video-formats.jpg`): raster van formaten (UGC, cinematic, product, podcast-clips, image ads, elk met één zin), daarna "adverteer op elk platform".

### 2.3 Creatieflow per stap

Bron: de blog-tutorial over "product link naar video" en het helpcenter (`help.creatify.ai`). De app zelf is niet gezien; de volgorde hieronder is **aanname op basis van die tutorials**, de velden en opties zijn **zeker** omdat ze ook in de API staan.

| Stap | Wat de gebruiker ziet | Velden en opties | Standaard |
|---|---|---|---|
| 1 Invoer | Eén veld: product-URL | Link; daarna automatische analyse (naam, beschrijving, prijs, afbeeldingen) | – |
| 2 Assets | Raster met opgehaalde beelden | Minimaal 3 afbeeldingen of 1 video kiezen, eigen upload, "slimme assets" | Alle opgehaalde beelden aan |
| 3 Aanbod | Klein formulier | Normale prijs, actieprijs, aanbiedingstekst | Leeg |
| 4 Video-instellingen | Rij met presets | Platform (Instagram/YouTube/Facebook/TikTok), formaat 9:16 / 16:9 / 1:1, lengte 15/30/45/60 s, taal (75 opties in de API) | 9:16, 30 s, Engels, met het label "aanbevolen" |
| 5 Doelgroep | Vrij tekstveld met suggesties | Doelgroep (vrije tekst, in de API standaard "young adults") | Suggestie uit de productanalyse |
| 6 Script | Lijst van gegenereerde scripts | Invalshoek (ongeveer 20 schrijfstijlen in de API: voordelen, probleem-oplossing, drie redenen, "wist je dat", speciale aanbieding, en ongeveer 30 hook-stijlen), toon, eigen script | Eerste script geselecteerd |
| 7 Presentator | Raster met filters | Realistisch / gestileerd / eigen; filters op branche, gebruik, demografie (API: geslacht, leeftijdsgroep, locatie binnen/buiten, stijl selfie/presenter) | Een passende avatar voorgesteld |
| 8 Storyboard | Voorbeeldtegels | Tot 16 concepten, kies welke gerenderd worden | 6–8 geselecteerd |
| 9 Render | Bevestiging | Creditherinnering vlak voor de render | – |
| 10 Resultaat | Tegels per variant | Voorbeeld, download, bewerken | – |
| 11 Bewerken | "Quick edit" en volledige editor | Quick edit: avatar, stem, muziek, captions, formaat. Editor: scènelengte, volgorde, elementen, stickers, captions, effecten, tekst in beeld, opslaan als sjabloon | Captions aan |

Extra uit de API (zeker, `docs.creatify.ai`): captions kunnen uit, muziek uit, CTA uit, stock-B-roll uit, emotie uit; ongeveer 40 captionstijlen en 40 lettertypen; muziekvolume en voice-overvolume 0–1; webhook per render; modelversie met prijs per seconde. Een mislukte render op het snelle model wordt terugbetaald.

**Fouten** (aanname uit de troubleshooting-artikelen): een mislukte render toont een korte melding en een knop om opnieuw te genereren; credits worden bij mislukking niet afgeschreven.

**Credits** (zeker, pricing en API-docs): URL-naar-video en avatarvideo kosten 5 credits per blok van 30 s; het snelle model 0,5 credit per seconde; productvideo 2 credits per beeld; credits vervallen na twee maanden.

### 2.4 Tools van Creatify tegenover Reelay

| Tool bij Creatify | Reelay | Toelichting |
|---|---|---|
| URL to Video (link → complete ad) | **Missen, deels gepland** | Roadmap S1 (Shopify-import). Wij vragen de URL als context, halen niets op. |
| AI Avatar (script → presentator) | **Hebben** | Workflow A, stap Presentator; presentatorkiezer, stem, snelheid, achtergrond. |
| Scriptwriter met invalshoeken en hook-stijlen | **Hebben (één invalshoek)** | Wij schrijven drie gesproken hooks; invalshoekkeuze is U1 op de roadmap. |
| Product video (foto → bewegend beeld) | **Hebben** | Stap Productclip. |
| Captions met veel stijlen | **Hebben (drie stijlen)** | Bold / clean / karaoke, vier lettertypen. Voldoende; meer stijlen is geen prioriteit. |
| Tekst in beeld, CTA-knop, stickers, eindkaart | **Bewust niet** | Vaste regel: alleen captions in beeld (roadmap, 19 oktober 2026). |
| Video-editor, quick edit | **Bewust niet** | Geen editor (CLAUDE.md). Alternatief: opnieuw renderen met andere instelling. |
| Batch / varianten | **Missen, later** | U3. Layout mag er ruimte voor laten. |
| Vertaling van een afgeronde ad | **Hebben** | Workflow B en U4. |
| Brand kit (logo, kleur, lettertype) | **Hebben per project, missen als instelling** | Merkstijl per formulier; nog niet opgeslagen als standaard. |
| Custom avatar (eigen gezicht) | **Missen, later** | U2 noemt een eigen "digital twin" als optie. |
| Ad Flow (node-canvas), Agent-chat, Model Playground | **Bewust niet** | Geen node-editor, geen modelkeuze voor klanten. |
| Performance Agent, Competitor Tracker, Ad Library, Ad Launcher | **Bewust niet** | Geen analytics, campagnebeheer of adverteren (CLAUDE.md). |
| Image Ad, Ad Clone, talking photo | **Bewust niet** | Buiten het proces dat we automatiseren. |
| API en MCP voor klanten | **Niet gepland** | Pas relevant na de MVP. |

### 2.5 Prijsstructuur

Zeker, `creatify.ai/pricing` (`screens/creatify-pricing-plans.jpg`, `screens/creatify-pricing-comparison.jpg`):

- Drie tabbladen: Individual, Business, API. Een schakelaar maandelijks / jaarlijks met een kortingslabel.
- Individual: drie kaarten (Standard, Pro, Max) met maandprijs, doorgestreepte prijs bij jaarbetaling, creditaantal, aantal presentatoren, aantal sjablonen, aantal parallelle renders, en labels "Recommended" en "Best value". Business: één kaart met schuifregelaar-achtige opties voor credits en seats, plus Enterprise en een beheerde dienst.
- Onder de kaarten een lange vergelijkingstabel (credits, watermerk, bibliotheek, custom avatars, sjablonen, agent-functies, duur per video, parallelle renders, seats, brand spaces, support) en een FAQ (gratis plan, hoe credits opgaan, meenemen naar volgende maand, wijzigen/opzeggen, restitutie).
- API apart: twee creditbundels per maand.

Wat we eruit halen: één getal (credits of euro) per video is de taal die klanten begrijpen; een vergelijkingstabel is pas nodig bij meerdere plannen. Reelay heeft nu een budget per video en een schatting per formulier; dat is het goede begin.

### 2.6 Visuele en interactieve patronen (eigen woorden)

- Donkere, glanzende marketingstijl met grote gradiënten en een monospace accent voor knoppen. Niet onze richting (Reelay is licht en kalm), maar de **rangorde** is bruikbaar: één invoerveld boven de vouw, één knop, één bewijslijn.
- "Hoe het werkt" altijd in drie genummerde stappen met een klein beeld per stap.
- Formaten als een raster van kaarten met één zin.
- Prijskaarten met één uitgelicht plan, kortingslabel bij jaarbetaling, en een lange tabel onder de vouw.
- In de app (aanname): kiezers als rasters met filters (avatar, script), presets als pillen (platform, lengte), creditsaldo altijd rechtsboven.

### 2.7 Taal en toon

Engels, kort, resultaatgericht ("Paste a link. Get a video ad."), veel cijfers als bewijs, hoofdletters op knoppen. Leveranciers- en modelnamen staan wél in de marketing (eigen modellen) maar in de flow heten dingen "standard" of "fast".

### 2.8 Bronnen voor dit hoofdstuk

- https://creatify.ai/ (HTML opgehaald; in de browser omgeleid naar de app, niet bekeken) — zeker voor de sectievolgorde
- https://creatify.ai/sitemap_en.xml — zeker
- https://creatify.ai/features/url-to-video — zeker, screenshot
- https://creatify.ai/features/ai-avatar — zeker, screenshot
- https://creatify.ai/use-cases — zeker, screenshots
- https://creatify.ai/pricing — zeker, screenshots
- https://help.creatify.ai (collecties Creative Tools, How To's, Editor, Troubleshooting, FAQ) — zeker voor titels en korte inhoud; de meeste artikelen zijn videowalkthroughs
- https://creatify.ai/blog (tutorial "product link naar video") — flow is aanname op basis van de tutorial
- https://docs.creatify.ai (link-to-video, lipsync v2, personas, voices, music categories, pricing per credit) — zeker voor velden, enum-waarden en credits

Achter de inlog: het echte dashboard, het projectoverzicht, de editor, de exacte foutmeldingen, de volgorde van de wizard.

---

## 3. MakeUGC (makeugc.ai)

### 3.1 Informatie-architectuur

**Hoofdnavigatie** (zeker, `screens/makeugc-home-hero.jpg`):

```
[promobalk met aftelklok]
Features ▾   Developers ▾   AI models ▾   Pricing   Enterprise   Affiliate      Log in   [Sign up]
```

Footer: Features, Scale, AI models, Solutions, Resources, Legal. `/product-overview` bestaat niet (404); `/guide` is een promopagina. `/features/talking-actors` laadt de homepagina (zeker, dezelfde hero verscheen), dus feature-pagina's zijn vooral SEO-ingangen naar dezelfde boodschap.

**App-navigatie**: niet gezien (inlog). Uit de API-documentatie (zeker): avatars, stemmen met instelbare stemparameters, scripts of eigen audio, renders met status.

### 3.2 Homepage

Zeker (`screens/makeugc-home-hero.jpg`, `screens/makeugc-home-three-steps.jpg`):

1. Promobalk met aftelklok en één knop.
2. Hero: drie vinkjes als vertrouwenslijn ("vanaf 1 dollar", "video in minuten", "opzegbaar"), een kop van vijf woorden, één subzin, één zwarte knop, beoordelingssterren met aantal klanten, een rij 9:16-tegels met het label "AI generated" en een afspeelknop rechtsonder.
3. "Drie stappen" als drie kaarten met elk een mini-interface:
   - Start from anything: tabbladen Image / Video, een referentievak, een promptveld met teller "0 / 15.000".
   - Describe the ad: tabbladen Write script / Use audio, een scriptveld met een knop "Write with AI" en een teller "142 / 1500".
   - Generate, edit & launch: een 9:16-tegel met captiontekst erop en rechts schakelaars Captions (aan), Music, B-roll, en een knop "Export 4K".
4. Platformblok "niet alleen UGC", modellenblok, flows en bibliotheek, prijsteaser met drie plannen, FAQ, case studies, afsluitende knop.

### 3.3 Creatieflow per stap

Zeker voor velden (homepage-mockups en API-docs), **aanname** voor de volgorde in de app:

| Stap | Velden en opties | Standaard |
|---|---|---|
| Start | Kies een presentator (bibliotheek met filters geslacht, leeftijd, huidskleur, type), kloon jezelf, kies een videomodel, of begin met een prompt, product-URL of referentie-ad | Presentator |
| Beschrijf | Script typen of plakken (teller tot 1.500 tekens), "schrijf met AI vanaf productpagina", of eigen audio uploaden; productfoto uploaden "voor in de hand" (achtergrond wordt verwijderd, productnaam invullen) | Script typen |
| Stem | Per taal stemmen met een label als "vrouw · warm"; 50+ talen; gebaren | Stem van de presentator |
| Genereer | Render in ongeveer twee minuten; captions aan/uit, muziekkeuze, B-roll automatisch, trimmen; export in HD / 2K / 4K; batch van 10 varianten | Captions aan, muziek upbeat, B-roll auto |

Credits (zeker, pricing en API): 500 / 1.000 / 2.000–5.000 credits per plan; 1 API-credit is 100 zichtbare credits per generatie; parallelle renders 1 / 10 / onbeperkt; export 480p–720p op het laagste plan, HD tot 4K hoger.

Fouten en bewerken: niet publiek gedocumenteerd (aanname: zelfde patroon als Creatify, mislukte render terugbetaald; niet bevestigd).

### 3.4 Tools van MakeUGC tegenover Reelay

| Tool bij MakeUGC | Reelay | Toelichting |
|---|---|---|
| Talking actors (script → presentator) | **Hebben** | Stap Presentator. |
| Product in de hand (foto, achtergrond weg) | **Missen** | Interessant voor later; HeyGen kent het niet als API-optie, dus niet gepland. |
| Clone jezelf | **Missen, later** | U2. |
| Script met AI vanaf productpagina | **Hebben (uit beschrijving), missen (uit URL)** | S1. |
| Eigen audio als stem | **Bewust niet (nu)** | Niet nodig voor het proces; later denkbaar. |
| Stemlabels per taal ("vrouw · warm") | **Deels** | Onze stemkiezer toont naam, geslacht en een voorbeeld; een sfeerlabel ontbreekt omdat de leverancier het niet geeft. |
| Captions aan/uit, muziek, B-roll auto | **Hebben (captions altijd aan, muziek vast, productclip als B-roll)** | Keuze "captions uit" bewust niet. |
| Export HD / 2K / 4K | **Hebben 1080p** | Geen extra keuze; upscaling alleen als optie in Workflow B. |
| Batch 10 varianten | **Missen, later** | U3. |
| Image ads, cinematic clips, 15 modellen | **Bewust niet** | Geen modelkeuze voor klanten. |
| AI Flows, content library | **Bewust niet** | Geen node-editor. |
| API | **Niet gepland** | – |

### 3.5 Prijsstructuur

Zeker (`screens/makeugc-pricing-plans.jpg`): kop, een regel "probeer elk plan voor 1 dollar", een schakelaar maandelijks / per kwartaal (korting) / jaarlijks (grotere korting), een zwarte promobalk "beperkt: extra credits" met aftelklok, drie kaarten (Starter, Growth, Pro) met één uitgelichte kaart, maandprijs met kortingslabel, één knop per kaart, een korte lijst "Features" met vinkjes, daaronder een "alles in elk plan"-lijst en een vergelijkingstabel. Enterprise apart.

### 3.6 Visuele en interactieve patronen (eigen woorden)

- Licht, veel wit, zwarte knoppen, één blauwe accentknop voor het aanbevolen plan. Dichter bij Reelay's stijl dan Creatify.
- De "drie stappen" tonen **echte mini-interfaces** in de kaarten (tabbladen, tellers, schakelaars) in plaats van illustraties. Dat legt de app uit zonder tekst.
- Tegels met een klein monospace label linksboven en een ronde afspeelknop rechtsonder; precies het patroon dat Reelay's `ProjectTile` al gebruikt.
- Tellers bij tekstvelden ("142 / 1500") maken limieten voelbaar.
- Schaarste-elementen (aftelklok, "limited") zijn marketing en passen niet bij Reelay's kalme toon.

### 3.7 Taal en toon

Engels, kort, met vinkjes en cijfers. Koppen als belofte. Modellen worden juist wél bij naam genoemd (verkoopargument "elk model in één studio"). Voor Reelay blijft de regel: geen leveranciers in de klantflow.

### 3.8 Bronnen voor dit hoofdstuk

- https://www.makeugc.ai/ — zeker, screenshots
- https://www.makeugc.ai/pricing — zeker, screenshot
- https://www.makeugc.ai/features/talking-actors (toont de homepagina) — zeker; de talking-actors-inhoud komt uit de eerder opgehaalde HTML van de feature-pagina en de API-docs
- MakeUGC API-documentatie (v2: avatars, voices, voice_settings, renders) — zeker voor velden
- `/product-overview` 404, `/guide` promo — zeker

Achter de inlog: dashboard, bibliotheek, de wizard zelf, de editor, foutmeldingen.

---

## 4. Reelay nu (alleen gelezen, niets gewijzigd)

Bekeken in de browser eerder deze sessie (screenshots `screens/reelay-*.jpg`) en in de code (`src/components/ProjectForm.tsx`, `src/components/translate/TranslateForm.tsx`, `src/components/translate/TranslateProjectView.tsx`, `src/components/dashboard/*`, `src/components/Sidebar.tsx`).

- **Navigatie**: Dashboard, New video, Projects, Settings; één accentknop "Create new video" bovenin de zijbalk; tagline in de voet. Goed en klein.
- **Dashboard**: begroeting, recente projecten als 9:16-tegels, "How it works" in drie stappenkaarten (Productclip, AI-presentator, Montage), een inspiratierij, een gebruikskaart. De stappenkaarten beschrijven alleen Workflow A; de vertaalworkflow is niet zichtbaar op het dashboard.
- **Nieuwe video (`/new`)**: kiezer met twee kaarten (advertentie / vertaling), één zin uitleg. Werkt, maar de kaarten tonen geen voorbeeldbeeld of indicatie van tijd en kosten.
- **Advertentieformulier (`/new/ad`)**: één lange pagina met productfoto's, productnaam, URL, projectnaam, beschrijving, lengte (10–60 s), aanbod, regie, taal, accent, stem, snelheid, presentatorkiezer, achtergrond, merkstijl (kleur, captionstijl, lettertype, logo), script (optioneel), "eerst script nakijken", kostenschatting en de knop. Compleet, maar alles staat open; de kiezers voor presentator en stem zijn groot. Het formulier is de beste plek voor winst.
- **Vertaalformulier (`/new/translate`)**: video-upload met voorbeeld, projectnaam, gesproken taal, doeltalen (zoekbare keuzelijst), woorden die niet vertaald mogen worden, snel/precies met prijs per minuut, stilte wegknippen, captionpositie, formaat, verbetering, rechtenvinkje, knop. Compacter dan het advertentieformulier en logisch geordend.
- **Projectpagina**: koptekst met status, pipeline als stappenkaarten (links), statuskaart en detailkaart (rechts, sticky), daaronder kwaliteitscontrole en als laatste de video's. Bij "klaar" moet de klant naar beneden scrollen voor het resultaat.
- **Projectenlijst**: filter op status; geen filter op soort workflow.
- **Settings**: placeholder.

---

## 5. Vergelijkingstabel

Inspanning: klein (een dagdeel, alleen UI), middel (een dag of twee, UI plus data), groot (meerdere dagen of nieuwe pipeline-stap).

| Gebied | Zij (Creatify / MakeUGC) | Wij | Kans | Inspanning | Effect voor de klant |
|---|---|---|---|---|---|
| Eerste scherm van de creatie | Eén veld (URL, prompt of script), rest later | Alles op één pagina | Formulier in blokken met ingeklapte optionele secties | Middel | Minder drempel, zelfde opties |
| Aanbevolen standaard | Expliciet "aanbevolen" bij 9:16 / 30 s | Standaard ingevuld, niet benoemd | Eén regel bij lengte en formaat | Klein | Vertrouwen, minder twijfel |
| Kosten vooraf | Credits bij de knop en vóór de render | Schatting onder de knop | Schatting herhalen in de bevestiging; werkelijk bedrag per video op het resultaat | Klein | Geen verrassing |
| Resultaat tonen | Tegels bovenaan, bewerken ernaast | Video onderaan na pipeline | Video bovenaan zodra klaar, pipeline ingeklapt | Klein | Snel bij het resultaat |
| Varianten | 6–10 per run | Eén, drie hooks in het script | Hooks als drie kaarten met keuze; "maak alle drie" later | Middel | Voorbereiding op U3 |
| Bewerken achteraf | Quick edit + editor | Alleen retry per stap | "Opnieuw renderen met andere stem/presentator" vanaf het resultaat | Middel | Herstel zonder nieuw project |
| Merkinstellingen | Brand kit / brand space | Per project opnieuw | Settings → Merk, als standaard in het formulier | Middel | Minder werk per video |
| Presentator kiezen | Raster met filters (geslacht, leeftijd, setting) | Raster met uitgelichte looks en zoeken | Filters geslacht en setting toevoegen; eerst 8 tonen, "meer" eronder | Klein | Sneller kiezen |
| Stem kiezen | Label per stem ("warm") | Naam, geslacht, voorbeeld | Geen labels (leverancier geeft ze niet); wel "aanbevolen voor deze presentator" | Klein | Minder keuzestress |
| Projectenlijst | Per tool gegroepeerd | Statusfilter | Filter soort + label op tegel | Klein | Overzicht bij twee workflows |
| Dashboard-uitleg | Drie stappen met mini-interfaces | Drie illustraties, alleen Workflow A | Twee rijen: advertentie en vertaling, met echte mini-elementen | Middel | Beide workflows meteen begrepen |
| Tekst in beeld, CTA, eindkaart | Standaard aan, uitschakelbaar | Bewust alleen captions | Niets doen | – | Vaste regel |
| Editor, node-canvas, analytics, ad launcher | Aanwezig | Bewust niet | Niets doen | – | Scope bewaken |

---

## 6. Voorstel voor de nieuwe layout

Alles blijft in het bestaande ontwerpsysteem (lichte stijl, kaarten, één accentpil per pagina, mono micro-labels). Geen nieuwe kleuren, geen donkere modus.

### 6.1 Navigatie

Ongewijzigd in opzet, met één toevoeging onder Settings:

```
[Reelay]
(● Create new video)            ← accentpil, blijft

Dashboard
New video
Projects
Settings
  ├ Brand        ← nieuw: logo, kleur, captionstijl, lettertype, standaardstem/presentator
  └ Usage        ← bestaande gebruikskaart hier naartoe
```

### 6.2 Dashboard

```
Good afternoon, Tijs                                   (● Create new video)

Recent projects                                          See all →
[9:16 tile] [9:16 tile] [9:16 tile] [9:16 tile]
 AD · Done   TRANSLATION · 2/3   AD · Failed  AD · Done

How it works
Make an ad from a product photo          Translate an existing video
[1 Product clip][2 AI presenter][3 Edit] [1 Upload][2 Translate][3 Captions and 9:16]
 (kaart met mini-element: foto → clip)    (kaart met mini-element: taalchips)

Inspiration (blijft)
```

Wijzigingen: soortlabel in mono op de tegel ("AD" / "TRANSLATION"); "How it works" krijgt twee rijen, één per workflow; mini-elementen in de kaarten in plaats van alleen illustraties (bijv. een taalchip-rij, een captionregel).

### 6.3 Kiezer voor een nieuwe video (`/new`)

```
New video
What do you want to make? Both run on their own after you click start.

┌───────────────────────────────┐  ┌───────────────────────────────┐
│ [9:16 voorbeeldtegel]          │  │ [9:16 voorbeeldtegel]          │
│ Make an ad from a product photo│  │ Translate an existing video    │
│ Photos + description → 9:16 ad │  │ Video → same video in 1–5 lang.│
│ ≈ 6 min · from $x per video    │  │ ≈ 4 min · from $y per minute   │
│ [Start →]                      │  │ [Start →]                      │
└───────────────────────────────┘  └───────────────────────────────┘
```

Toevoegen: een stand-in beeld, een tijdsindicatie en de startprijs uit `src/lib/pricing.ts`. Geen derde kaart.

### 6.4 Advertentieformulier (`/new/ad`) in drie blokken

Eén pagina, drie genummerde blokken (zelfde `StepCard`-stijl als het dashboard), elk met een ingeklapte "More options"-sectie. Rechts een sticky samenvatting met de schatting en de knop.

```
New ad                                              ┌──────────────────┐
                                                    │ Summary           │
1  Product                                          │ 30 s · 9:16 · EN  │
   [Product images ▢▢▢ upload]                      │ Presenter: Olivia │
   Product name ____________                        │ Voice: …  Speed 1 │
   Description ____________________                 │ Captions: Bold    │
   Video length (10 20 [30] 45 60)  Recommended: 30 s│ Estimate  $1.20   │
   ▸ More: product URL, offer, direction            │ Budget    $1.50   │
                                                    │ (Generate video)  │
2  Presenter and style                              │ ☐ Review script   │
   Language [EN ▾]  Accent [▾]  Voice [▾ ▶]  Speed   │   first           │
   Presenter: [8 looks in a row] [Show all]         └──────────────────┘
   ▸ More: background, brand style (prefilled from Settings → Brand)

3  Script (optional)
   Leave empty and we write it. [textarea, counter 0 / 150 words]
   ▸ More: project name (default: product name)
```

Keuzes en waarom:

- Blok 1 bevat alleen wat nodig is om te starten. URL, aanbod en regie gaan onder "More" omdat ze optioneel zijn.
- Projectnaam krijgt de productnaam als standaard; het veld verhuist naar "More".
- Presentatorrij toont eerst acht uitgelichte looks met "Show all" voor de volledige kiezer (bestaand component).
- Merkstijl wordt vooringevuld uit Settings → Brand en staat ingeklapt; wie nooit een merk instelt ziet de velden gewoon zoals nu.
- De sticky samenvatting toont de schatting en het budget naast de knop; de bevestiging herhaalt het bedrag. Dit vervangt de schatting onderaan.
- "Review script first" blijft een schakelaar naast de knop.

Op een telefoon stapelen de blokken en wordt de samenvatting een vaste balk onderaan met het bedrag en de knop.

### 6.5 Vertaalformulier (`/new/translate`)

Al compact; dezelfde opmaak toepassen voor consistentie:

```
1  Video            [upload met voorbeeld]  Spoken language [auto ▾]
2  Languages        Translate into [chips + zoek]   Speed/Precision [cards with $/min]
   ▸ More: keep these words, remove silence, caption position, format, enhance
3  Confirm          ☐ I own the rights … (verplicht)        Estimate per language  $x
                                                            (Start translation)
```

### 6.6 Projectpagina / resultaatpagina

Twee toestanden op dezelfde route.

**Bezig**:

```
← Dashboard                                           Processing
Product name — Ad · created 20 Oct

[1 Script ✓] [2 Product clip ●] [3 AI presenter ●] [4 Final edit ○]   │ Status card
"2 of 4 steps done. You can leave this page."                          │ Details card
```

**Klaar**:

```
← Dashboard                                           Completed
Product name — Ad · created 20 Oct      [Download] [Make another ▾]

┌────────────┐  What you got
│  9:16      │  30 s · 9:16 · English · captions Bold
│  player    │  Presenter Olivia · Voice …
│            │  Cost  $1.18 (estimate was $1.20)
└────────────┘  Re-render with: [another voice] [another presenter] [edited script]

▸ Pipeline (ingeklapt, 4 steps completed)
▸ Script used (ingeklapt)
```

Voor Workflow B: één kaart per taal in dezelfde opmaak (speler links, feiten rechts, download), de kwaliteitscontrole per taal ingeklapt onder de kaart. "Re-render" start alleen de stappen die veranderen; het zijn de bestaande retry-paden met een vooringevuld formulier.

### 6.7 Projectenlijst

Filterrij met twee groepen: status (All / Processing / Completed / Failed) en soort (All / Ads / Translations). Tegel krijgt het mono-soortlabel.

---

## 7. Bouwvolgorde (stappen 1–4 gebouwd op 20 oktober 2026)

Eerst de kleine, zichtbare winst, dan de structuur, dan wat data vraagt. Alles blijft binnen de huidige scope; geen nieuwe pipeline-stappen.

1. **Resultaat bovenaan** op de projectpagina, pipeline ingeklapt als het project klaar is; werkelijk bedrag op de resultaatkaart. Klein. **Gebouwd** (`79d21c7`): `ResultHero` in `ProjectView.tsx`, `ResultSection` in `TranslateProjectView.tsx`, nieuw `src/components/ui/Collapsible.tsx`; feiten (lengte, formaat, taal, kwaliteit, toon, klaar in) naast de speler; in databasemodus het werkelijke bedrag uit de kostenbewaking met de schatting ernaast, in demomodus de schatting met het label dat niets is afgeschreven. Tijdens het verwerken blijft de oude opbouw. Screenshots `reelay-after-project-page-result-top.jpg`, `reelay-after-project-page-folded.jpg`, `reelay-after-translate-result-top.jpg`.
2. **Aanbevolen standaard en 9:16-uitleg** in beide formulieren; schatting herhalen in de bevestiging. Klein. **Gebouwd** (`a641ef8`): lengte-optie "30 seconds · recommended" plus hint, badge "Recommended" op de standaardkwaliteit (uit `DEFAULT_PRESENTER_ENGINE`) en op Speed, 9:16-uitleg bij de foto-upload en bij het formaat, schatting op de knop ("Generate video · $1.40") en een inline bevestiging met lengte, kwaliteit, taal (A) of seconden, kwaliteit, talen (B) en hetzelfde bedrag; "Start now" start pas daarna. Screenshots `reelay-after-form-recommended.jpg`, `reelay-after-form-confirmation.jpg`. Aandachtspunt: met het budget van $1,50 is de aanbevolen combinatie 30 s + Premium ($1,93) boven budget, dus de badge "Recommended" staat naast "over budget" tot het budget of de standaard verandert.
3. **Kiezer `/new`** met voorbeeldtegel, tijd en startprijs. Klein. **Gebouwd** (`f73f266`): `src/components/WorkflowChooser.tsx`; eigen voorbeeld (telefoonkader met caption, taalchips), "Typical wait" als gemiddelde van afgeronde projecten van die soort uit de projectenlijst (database of demo; eerste stap gestart → laatste stap klaar), met een vaste aanname zolang er niets gemeten is (advertentie 10 min, aanname; vertaling 5 min, gemeten op 20 oktober), en "from $…" als goedkoopste combinatie uit `src/lib/pricing.ts` (10 s Standard; 60 s Speed per taal). Screenshot `reelay-after-new-chooser.jpg`.
4. **Projectenlijst en tegels** met soortfilter en soortlabel. Klein. **Gebouwd** (`ccde807`, `b5f9161`): tweede pillenrij All / Ads / Translations met aantallen, soortlabel onder elke tegel (Ad / Translation), echte lengte op afgeronde tegels in plaats van een vaste waarde, skeleton tot de lijst er is, lege toestanden per combinatie; filteren gebeurt in `useMemo` per wijziging. Screenshot `reelay-after-projects-filters.jpg`.
5. **Advertentieformulier in drie blokken** met ingeklapte opties en sticky samenvatting; presentatorrij met "Show all". Middel. Dit is de grootste verandering en komt pas als 1–4 staan, zodat het formulier in één keer kan worden getest.
6. **Dashboard "How it works" in twee rijen** met mini-elementen. Middel.
7. **Settings → Brand** (opslaan van merkstijl en standaardstem/presentator, vooringevuld in het formulier). Middel; vraagt een kleine tabel of een JSON-kolom per gebruiker, dus na de toegangscode uit fase 8.
8. **Re-render met andere instelling** vanaf het resultaat. Middel; hergebruikt retry, maar vraagt een vooringevuld formulier en een duidelijke kostenbevestiging.

Niet in deze volgorde en niet gepland: varianten in batch (U3), tekst in beeld of eindkaarten, een editor, modelkeuze, analytics.

---

## 8. Screenshots

Alle bestanden in `docs/research/screens/`, publieke pagina's, 20 oktober 2026.

| Bestand | Wat |
|---|---|
| `creatify-url-to-video-hero.jpg` | Feature-pagina: belofte, één veld, één knop, bewijslijn |
| `creatify-ai-avatar-hero.jpg` | Feature-pagina presentator |
| `creatify-use-cases-hero.jpg`, `creatify-use-cases-video-formats.jpg` | Use cases en formatenraster |
| `creatify-pricing-plans.jpg`, `creatify-pricing-comparison.jpg` | Prijskaarten en vergelijkingstabel |
| `makeugc-home-hero.jpg` | Hero met vinkjes, knop, tegelrij |
| `makeugc-home-three-steps.jpg` | Drie stappen met mini-interfaces |
| `makeugc-pricing-plans.jpg` | Prijskaarten met periode-schakelaar |
| `reelay-new-ad-form-script.jpg`, `reelay-new-ad-form-brand-style.jpg` | Huidig advertentieformulier |
| `reelay-script-review.jpg` | Huidige scriptreview |
| `reelay-voice-picker.jpg` | Huidige stemkiezer |
| `reelay-new-translate-form-top.jpg`, `reelay-new-translate-form-options.jpg` | Huidig vertaalformulier |
| `reelay-project-page-translate.jpg`, `reelay-project-page-quality-check.jpg` | Projectpagina (vertaling) vóór de bouw |
| `reelay-after-*.jpg` | Na bouwstappen 1–4 (20 oktober 2026): resultaat bovenaan, ingeklapte pijplijn, vertaalresultaat, aanbevolen labels, bevestiging, kiezer, filters |
