# Roadmap: van productfoto naar 9:16-advertentie

Datum: 18 oktober 2026. Dit document vervangt de keten "Vmake → HeyGen → VEED" uit `docs/master-prompt.md`. Het proces blijft, de diensten zijn gekozen op basis van `docs/api-verification.md`: alleen diensten met een gedocumenteerde, self-serve API.

## Het proces dat de app automatiseert

```
1  Invoer         productfoto's + productinformatie (naam, beschrijving, URL, doelgroep)
2  Script         hook + script per invalshoek (problem/solution, UGC/testimonial, product demo)
3  Productclip    B-roll uit de productfoto (9:16, 5–10 s)
4  Presentator    AI-presentator spreekt het script uit (9:16)
5  Montage        presentator als basis, productclip eroverheen op vaste momenten, ondertitels van wat de
                  presentator zegt (het enige in beeld; vaste regel van 19 okt 2026), als 9:16 MP4
6  Resultaat      preview + download
```

Stap 3 en 4 kunnen parallel; stap 5 wacht op beide. Stap 2 levert de tekst voor 4 en de overlays voor 5.

## Dienst per stap

| Stap | Dienst | Waarom deze | Status van de verificatie |
|---|---|---|---|
| 2 Script en hook | **Claude API** (`claude-opus-5-5`) | Eén aanroep met de productinfo en de foto levert hook, script, voordelen en CTA als gestructureerde JSON. Het formulier belooft dit al ("Leave empty and we write a short script"). | Officiële SDK, gedocumenteerd. |
| 3 Productclip | **fal.ai** image-to-video | Foto + prompt → MP4 in 9:16; polling via queue; betaalbaar (rond $0,25–0,50 per clip). Modelkeuze (Kling, Veo, Seedance) in fase 7. | Geverifieerd (aspect ratio, output-URL). Webhooks niet geverifieerd. |
| 4 Presentator | **HeyGen v3** `POST /v3/videos` | Volledig gedocumenteerd: avatars, stemmen, `aspect_ratio: "9:16"`, productfoto als achtergrond, captions, webhooks. Pay-as-you-go. | Geverifieerd. Alleen v3 gebruiken; v1/v2 stoppen 31 oktober 2026. |
| 5 Montage | **Shotstack** Edit API, reserve: **Creatomate** | Shotstack: timeline met clips, tekst en audio, `callback`-webhook, templates, gratis sandbox. Creatomate: auto-ondertitels en 9:16 expliciet gedocumenteerd. | Deels: Shotstack-captions en 9:16, en Creatomate-concatenatie worden in fase 7 praktisch getest. |
| 5 (alternatief) | HeyGen v3 "studio" | Kan scènes aaneenrijgen (video, foto, presentator) en captions inbranden in 9:16. | Geverifieerd, maar **zonder** tekst-overlays, CTA, muziek en overgangen. Niet genoeg voor de advertentie-opbouw; bruikbaar als noodoplossing of voor een kale variant. |
| 6 Opslag en download | Eigen bestandsopslag (keuze in fase 8) | Alle leveranciers geven tijdelijke URL's. | n.v.t. |

Niet gekozen: Vmake (geen productvideo-API) en VEED (geen montage-API). Zie `docs/api-verification.md`.

## MVP: één product → één complete 9:16-advertentie, één invalshoek

Doel: een gebruiker vult het formulier in, kiest alleen de lengte (10, 20, 30, 45 of 60 seconden; standaard 30), en krijgt één afgeronde advertentie in de invalshoek "problem/solution" met één standaardpresentator die de hele advertentie doorpraat en één standaardmuziektrack.

| # | Stap | Wat het oplevert | Dienst | Wat Tijs vooraf regelt |
|---|---|---|---|---|
| M1 | Script | JSON met `hook`, `scenes[]` (tekst per scène), `benefits[]`, `offer`, `cta`, `presenterScript`; gegenereerd uit naam, beschrijving, URL en de eerste foto (Claude kijkt naar de foto). | Claude API | Anthropic Console-account, tegoed, sleutel `ANTHROPIC_API_KEY`. |
| M2 | Productclip | 9:16 MP4 van 5–10 s uit de eerste foto, met een prompt afgeleid uit het script. | fal.ai | fal.ai-account, tegoed, sleutel `FAL_KEY`. |
| M3 | Presentator | Eén 9:16 MP4 van de volledige lengte waarin de standaardavatar `presenterScript` uitspreekt (HeyGen: max 5.000 tekens en 30 minuten per video, dus geen splitsing nodig). | HeyGen v3 | HeyGen-account, API-credits, sleutel `HEYGEN_API_KEY`, webhook-endpoint geregistreerd. |
| M4 | Montage | 9:16 MP4: de presentatorvideo loopt de hele advertentie door als basis (beeld en stem); de ene productclip op vaste momenten eroverheen (steeds een ander stuk, afwisselend in- en uitgezoomd); ondertitels van wat de presentator zegt als enige tekst in beeld (herzien 19 okt 2026: hook-tekst, voordeel-labels en eindkaart zijn geschrapt, zie "Vaste regel"); de interface belooft geen muziek. Opbouw per lengte in `src/lib/adLayout.ts`. | Shotstack (reserve Creatomate) | Shotstack-account, sandbox-sleutel `SHOTSTACK_API_KEY`; één rechtenvrije muziektrack met licentie in onze opslag. |
| M5 | Orchestrator | Serverproces dat M1–M4 in volgorde start, status bijhoudt, webhooks en polling afhandelt, elk tussenresultaat naar eigen opslag kopieert, en retry per stap ondersteunt. | Eigen backend (fase 8) | Database en bestandsopslag; keuze en accounts in fase 8. |
| M6 | UI | Bestaande schermen aangesloten op echte statussen; "Demo mode" uit. | – | – |

Acceptatie van de MVP: vijf verschillende producten doorlopen de keten zonder handmatig ingrijpen, elk resultaat is downloadbaar, de kosten per advertentie zijn bekend.

Kostenindicatie per advertentie van 30 s (ruw, uit de bronnen in `docs/api-verification.md`): Claude < $0,05, fal.ai ~$0,50, HeyGen ~$2, Shotstack ~$0,20. Samen rond $3.

## Uitbreidingen na de MVP

| # | Uitbreiding | Wat het oplevert | Dienst | Extra te regelen |
|---|---|---|---|---|
| U1 | Meerdere invalshoeken | Per project 2–3 scripts (problem/solution, UGC/testimonial, product demo); gebruiker kiest of laat alles maken. | Claude API (één aanroep met meerdere varianten) | Niets nieuws. |
| U2 | Meerdere presentators | Avatar- en stemkeuze in het formulier, uit `GET /v3/avatars/looks` en `GET /v3/voices`. | HeyGen v3 | Niets nieuws; eventueel eigen "digital twin" op een betaald HeyGen-plan. |
| U3 | Varianten in batch | Per invalshoek meerdere hooks en presentators tegelijk; resultaten als set op de projectpagina. | HeyGen (10 gelijktijdige video's op pay-as-you-go), Shotstack, fal.ai | Hogere limieten bij HeyGen aanvragen als 10 te weinig is. |
| U4 | Vertalingen | Afgeronde advertentie in andere talen met lip-sync. | HeyGen `POST /v3/video-translations` | Niets nieuws. |
| U5 | Meerdere productclips | Alle geüploade foto's worden clips; montage wisselt ze af. | fal.ai | Niets nieuws. |
| U6 | Muziekkeuze en merkstijl | Keuze uit enkele tracks, kleuren en lettertype voor overlays. | Shotstack-templates met merge-velden | Muziekbibliotheek met licenties. |
| U7 | Eigen productfoto in HeyGen-achtergrond | Presentator vóór de productfoto in plaats van een egale achtergrond. | HeyGen `background: {type: "image"}` met `remove_background` | Avatar met matting-ondersteuning kiezen. |

### Verbeteringen aan de scriptstap (nog niet gebouwd, 19 oktober 2026)

Uit de eerste tests op `/dev/script` kwamen deze wensen. Ze staan hier geparkeerd tot de MVP end-to-end werkt; geen ervan is nodig voor de eerste echte video.

| # | Verbetering | Wat het oplevert | Hoe | Opmerking |
|---|---|---|---|---|
| S1 | Shopify-import | Productnaam, beschrijving, prijs en foto's automatisch uit de winkel halen in plaats van overtypen. | Shopify Storefront/Admin API of de publieke `products/<handle>.json`-route van een winkel. | Vraagt een Shopify-app of toegangstoken per winkel. Nu wordt de product-URL alleen als tekst meegegeven, niet opgehaald. |
| S2 | Veld voor het aanbod | Een eigen veld voor korting, bundel of gratis verzending, zodat de eindkaart het echte aanbod toont. | Extra veld in het formulier en in `ScriptInput`; de prompt mag alleen dít aanbod gebruiken. | Nu mag Claude geen prijzen of kortingen verzinnen, dus zonder dit veld blijft het aanbod algemeen. |
| S3 | Controle op tegenstrijdigheden | Waarschuwing vóór het starten als naam, beschrijving en foto niet bij elkaar passen (bijvoorbeeld "serum" in de naam, een jurk op de foto). | Goedkope controle met Haiku 5.5 (één korte aanroep, ~$0,001) vóór de betaalde scriptstap. | Voorkomt een verspilde run van ~$1. |
| S4 | Filteren van ruis | Winkeltekst zoals verzendinformatie, retourvoorwaarden en SEO-vulling uit de beschrijving halen vóór het script. | Zelfde Haiku-aanroep als S3, of een vaste lijst met patronen. | Vooral nuttig in combinatie met S1. |
| S5 | Meerdere hooks | Drie tot vijf hook-varianten per script, de gebruiker kiest er één of laat alles maken. | Eén Claude-aanroep met een array van hooks in het schema; sluit aan op U1 en U3. | Meer hooks is pas zinvol als de montage per hook een variant kan maken (U3). |

Niet op de roadmap, conform CLAUDE.md: analytics, campagnebeheer, advertenties plaatsen, een node-editor of een volledige video-editor.

## Volgorde van bouwen (fase 7 en verder)

1. **HeyGen** eerst: meest zekere API, grootste deel van de kosten, webhooks. Losse test: script in → MP4 uit.
2. **Claude**: script-generatie met gestructureerde output; test op vijf producten.
3. **fal.ai**: modelkeuze en promptsjabloon; test op dezelfde vijf foto's.
4. **Shotstack**: montagesjabloon met hook, presentator, productclip, voordelen, eindkaart, ondertitels, muziek. Als captions of 9:16 niet werken zoals gehoopt: dezelfde test op Creatomate.
5. **Fase 8**: database, opslag, achtergrondjobs, webhooks, orchestrator, retry.
6. **Fase 9**: end-to-end met echte producten; Demo mode uit.

## HeyGen-functies per fase

Beoordeling van alles wat de HeyGen-API kan (volledige referentie: `docs/vendors/heygen/capabilities.md`), afgezet tegen ons advertentieproces. Tarieven zijn enterprise-indicaties (1 credit = $0,50).

| Functie | Fase | Reden |
|---|---|---|
| Avatar-video (`POST /v3/videos`, `type: avatar`, 9:16, Avatar IV/III) | **MVP** | Dit is de presentatorstap. Avatar IV als standaard (≈ $0,05/s); Avatar III als goedkope variant na de kwaliteitsvergelijking op `/dev/heygen`. |
| Looks en stemmen opvragen | **MVP** | Nodig om één vaste standaardpresentator en -stem te kiezen; gratis. |
| Webhooks (`callback_url`, geregistreerd endpoint) | **MVP** (fase 8) | Vervangt polling in de orchestrator; HMAC-verificatie en dedupe op `callback_id`. |
| Account/saldo (`GET /v3/users/me`) | **MVP** | Kosten per project meten en een lage-saldo-waarschuwing tonen. |
| Captions (`caption.style`) en `subtitle_url` | **MVP, te testen** | Als de montage-dienst zelf geen goede auto-captions levert, gebruiken we HeyGens SRT of ingebrande captions op het presentatordeel. |
| Productfoto als achtergrond (`background.type: image` + `remove_background`) | **Uitbreiding U7** | Presentator vóór het product; vereist een avatar met matting. Eerst de kale versie laten werken. |
| Templates (Studio-lay-out met `text`-, `video`-, `audio`-, `character`-variabelen en captions) | **Mogelijk experiment na de MVP** | De enige HeyGen-route waarin hook-tekst, productclip, presentator, muziek en captions in één render samenkomen; zou één leverancier schelen. Geen geplande vervanging: Shotstack is de montagedienst voor de MVP (fase 7, stap 4, getest in de sandbox). Hooguit later één sjabloon proberen ter vergelijking; sjabloon moet handmatig in Studio worden gebouwd en de prijs is niet vermeld. |
| Studio-video (`type: studio`, scènes aaneen) | **Niet nodig** | Geen tekst-overlays, CTA, muziek of overgangen; templates doen meer. Hooguit als noodoplossing voor een kale variant. |
| Videomodellen (`/v3/models/videos` heygen-video-1 `image_to_video`, `/v3/video-generations` seedance-2.5 / minimax-h3-max) | **Uitbreiding, te vergelijken met fal.ai** | Zelfde taak als onze productclip-stap. Als prijs en kwaliteit kloppen, vervalt fal.ai en blijven er twee leveranciers over. Absolute prijzen ontbreken, dus eerst testen. |
| Batches (`/v3/videos/batches`, bulk-status) | **Uitbreiding U3** | Varianten in batch: meerdere hooks en presentators in één verzoek, één webhook als alles klaar is. Niet nodig voor één video. |
| Video-vertaling (`/v3/video-translations`, speed ≈ $1,50/min per taal, precision ≈ $3/min) | **Uitbreiding U4** | Afgeronde advertentie in andere talen met lipsync en SRT/VTT. Let op: vertaal de **eindvideo** of alleen het presentatordeel; bij vertaling van de eindvideo gaan ingebrande teksten niet mee, dus hook/CTA-overlays apart vertalen (Claude) en opnieuw monteren. Met `brand_glossary_id` voor productnamen. |
| Brand glossary (uitspraak, niet-vertalen, vaste vertalingen) | **Uitbreiding U4** | Productnaam en merktermen correct uitspreken en onvertaald laten. Gratis; klein werk, hoort bij vertalingen. |
| Meerdere presentators (looks per karakter, filter op engine) | **Uitbreiding U2** | Keuze in het formulier uit `GET /v3/avatars/looks`; `supported_api_engines` bepaalt welke engine. |
| Meerdere stemmen (catalogus, `voice_settings.speed`) | **Uitbreiding U2** | Stemkeuze bij de presentator; taalfilter voor niet-Engelse markten. |
| Stem klonen of ontwerpen | **Niet nodig (voorlopig)** | Pas relevant als een klant zijn eigen stem wil. Toestemming en opnames maken het zwaar voor de eerste versie. |
| Eigen avatar (photo / prompt / digital twin) | **Uitbreiding (later)** | "Eigen presentator" is een logische betaalde optie: photo-avatar is ≈ $0,50 per aanmaak en klaar in minuten. Digital twin vereist consent-flow; prompt-avatar heeft geen echte persoon nodig. Niet voor de MVP. |
| Cinematic avatar (7 credits ≈ $3,50 per clip van 4–15 s) | **Niet nodig** | Mooi voor B-roll met de presentator in beeld, maar duur en zonder script. Eventueel later als "premium shot". |
| Transparante achtergrond (`output_format: webm`) | **Uitbreiding, bij montage** | Presentator als laag over de productclip zetten in Shotstack/HyperFrames in plaats van naast elkaar. Alleen als de montage dat visueel beter maakt. |
| Muziekcatalogus (`GET /v3/audio/sounds`) en muziek genereren (`POST /v3/audio/music`, lyria-3-pro) | **MVP voor de catalogus, uitbreiding U6 voor generatie** | Lost ons muziek- en licentievraagstuk op: tracks met tijdelijke WAV-URL, in HeyGens catalogus. We downloaden de gekozen track naar eigen opslag en geven hem aan de montagedienst. Generatie op maat (bpm, intensiteit) is een nette uitbreiding. Licentievoorwaarden voor catalogusmuziek nog navragen. |
| Geluidseffecten (`type: sound_effects`) | **Uitbreiding U6** | Whoosh bij de hook of de CTA. Klein, cosmetisch. |
| Audio-analyse (beats, secties) | **Niet nodig** | Montage op de maat is een verfijning die onze vaste opbouw niet vraagt. |
| HyperFrames (HTML-compositie, cloud-render ≈ $0,05/min) | **Reserve voor de montage** | Volwaardig alternatief voor Shotstack met volledige controle en lage renderprijs, maar wij schrijven de compositie zelf. Overwegen als Shotstack in vormgeving tekortschiet. |
| Video Agent (prompt → complete video, ≈ $2/min) | **Experiment, niet in de keten** | Kan in één call een hele advertentie maken met captions en graphics, maar zonder onze vaste opbouw. Nuttig om ideeën te zien; niet als fundament, omdat we hook/voordelen/CTA zelf willen sturen. |
| Brand kit (kleuren, fonts, logo) | **Niet nodig** | Werkt alleen met Video Agent. Onze merkstijl gaat via het montagesjabloon (U6). |
| Bestaande video bewerken (`edit_plan`, scènes) | **Niet nodig** | Wij regenereren liever een stap met Retry dan dat we scènes bewerken; past ook alleen bij Video Agent-sessies. |
| Lipsync (nieuwe audio op bestaande video) | **Niet nodig** | Alleen nuttig als we één presentatorbeeld met wisselende voice-overs willen hergebruiken; vertaling dekt dat beter. |
| AI clipping, filler-word removal, transcriptie, podcasts, custom agents, realtime avatar, beeldgeneratie, quality comparison | **Niet nodig** | Buiten het advertentieproces. Quality comparison hooguit intern om engines te vergelijken. |
| Durable workflows (`/v3/workflows`) | **Niet nodig** | Orkestreert alleen HeyGen-stappen; onze keten bevat ook Claude, fal.ai en de montagedienst, dus de orchestrator blijft bij ons (fase 8). |
| API-sleutel met scopes | **MVP** | Productie-sleutel beperken tot `videos:write`, `videos:read`, `avatars:read`, `voices:read`, `account:read`, `webhooks:write`; uitbreiden per functie. |
| Assets-upload (`POST /v3/assets`) | **Uitbreiding U7** | Nodig zodra we een productfoto als achtergrond of een eigen foto-avatar meesturen; publieke URL's uit eigen opslag volstaan in de MVP. |

**Montagedienst voor de MVP:** Shotstack, gekozen in fase 7 (zie `docs/vendors/final-edit-comparison.md`) en in de sandbox getest met hook, TikTok-captions, voordelen en eindkaart. Een HeyGen-template is een mogelijk experiment ná de MVP, geen geplande vervanging; HyperFrames blijft reserve als Shotstack later tekortschiet in vormgeving.

## Workflow B: bestaande video vertalen

Datum onderzoek: 19 oktober 2026, actuele officiële documentatie (bronnen per onderdeel). Nog geen code.

**Doel:** de gebruiker uploadt een bestaande video (eigen opname, eerdere advertentie, presentatorclip) en krijgt dezelfde video terug in een andere taal: vertaalde tekst, een stem die op de spreker lijkt, mondbewegingen die kloppen, ondertitels, 9:16. De gebruiker mag elke video gebruiken die hij zelf aanlevert; rechten op het beeldmateriaal en de stem liggen bij hem. Watermerken verwijderen bouwen we niet.

**Verplichte bevestiging bij het uploaden.** Voordat een vertaling start, vinkt de gebruiker aan (de app is Engelstalig): *"I own the rights to this video and have the speaker's permission to use their voice and face."* Zonder vinkje geen vertaling: de knop blijft uitgeschakeld en de server weigert het verzoek als de bevestiging ontbreekt. De bevestiging wordt met tijdstip bij het project opgeslagen. Deze regel staat ook in `CLAUDE.md`.

```
Upload + rechtenbevestiging ─→ Vertalen (tekst + stem + lipsync) ─→ Correctie door gebruiker ─→ Ondertitels + 9:16 ─→ (optioneel) Verbetering ─→ Download
```

### Optie 1: HeyGen Video Translation (v3), met proofread

- **Wat het doet:** één aanroep vertaalt de video in 175+ talen, kloont de stem van de spreker, past lipsync toe en levert SRT/VTT-ondertitels. `mode: "speed"` (standaard lipsync) of `"precision"` (hertekent de mond, hogere kwaliteit, langzamer). Meerdere doeltalen in één verzoek. Bron: https://developers.heygen.com/docs/video-translate.md
- **Tekst aanpassen vóór het renderen:** ja, via **proofread-sessies**: `POST /v3/video-translations/proofreads` → pollen → `GET …/{id}/srt` (vertaalde SRT downloaden) → bewerken → `PUT …/{id}/srt` (geüploade correctie) → `POST …/{id}/generate` → `video_translation_id`. In de documentatie staat **geen Enterprise-vereiste** op proofread; alleen het meesturen van een eigen SRT als startpunt (`srt`, `srt_role`) is "Enterprise plan only". Zelf verifiëren met één sessie op het pay-as-you-go-account vóór we erop bouwen. Bronnen: https://developers.heygen.com/docs/video-translation-precision.md, https://developers.heygen.com/reference/create-proofread-session.md
- **Advertentietoon:** in de proofread-stap laten we **Claude** de vertaalde SRT herschrijven in advertentietoon (kort, direct, zonder nieuwe claims), tonen we het resultaat aan de gebruiker voor correctie, en uploaden we de goedgekeurde SRT. Zo krijgen we de controle van optie 2 zonder de stem- en lipsync-pipeline zelf te bouwen. Let op: timing per ondertitel blijft leidend; langere zinnen worden sneller uitgesproken of `enable_dynamic_duration` rekt de video.
- **Talen:** 175+ (lijst via `GET /v3/video-translations/languages`). **Brand glossary** voor productnamen die onvertaald moeten blijven.
- **Kosten (enterprise-tarieven als indicatie, 1 credit = $0,50; self-serve staat achter login):** speed 0,05 credit per seconde bron per doeltaal (≈ $0,75 per 30 s), precision 0,1 (≈ $1,50 per 30 s), proofread 0,00833 (≈ $0,13 per 30 s). Bron: https://developers.heygen.com/docs/enterprise-pricing
- **Beperkingen:** ingebrande teksten in de video vertalen niet mee; één spreker werkt het best (`speaker_num` instelbaar); verwerkingstijd ongeveer 5 minuten per minuut video; output-URL's verlopen (naar eigen opslag kopiëren).

### Optie 2: eigen pipeline met maximale controle

| Stap | Dienst | Kosten per 30 s (lijstprijs) | Bron |
|---|---|---|---|
| Transcriptie met woordtijden | fal.ai `fal-ai/whisper` (`chunk_level: word`, taalherkenning) of HeyGen `POST /v3/audio/transcriptions` (scribe-v2) | fal: pagina toont "$0 per compute second" (praktisch gratis tot centen); HeyGen: leverancierstarief, niet gepubliceerd | https://fal.ai/models/fal-ai/whisper/api, OpenAPI HeyGen |
| Vertaling in advertentietoon | Claude (`claude-opus-5-5`, gestructureerde output per segment) | ≈ $0,01–0,02 | `docs/vendors/anthropic/capabilities.md` |
| Correctie door gebruiker | eigen UI (segmenten met tijden) | – | – |
| Stemkloon | fal.ai `fal-ai/minimax/voice-clone` ($1,50 per kloon, voorbeeld $0,30 per 1.000 tekens) of HeyGen `POST /v3/voices/clone` (prijs niet vermeld) | $1,50 eenmalig per spreker | https://fal.ai/models/fal-ai/minimax/voice-clone |
| Nieuwe spraak per segment | fal.ai TTS (MiniMax Speech-02 HD $0,10 per 1.000 tekens, ElevenLabs Turbo v2.5 $0,05) of HeyGen `POST /v3/voices/speech` (Starfish ≈ $0,01/min) | ≈ $0,01–0,05 | https://fal.ai/explore/text-to-speech-apis, `docs/vendors/heygen/capabilities.md` |
| Timing passend maken | eigen code: per segment spraak genereren, versnellen of pauzes inkorten, audio samenstellen (ffmpeg) | – | – |
| Lipsync | fal.ai `fal-ai/sync-lipsync/v2` ($3/min, pro $5/min), VEED Lipsync 2.0 ($0,07/s via api.veed.io), HeyGen `POST /v3/lipsyncs` (speed 0,05 credit/s, precision 0,1) | $1,50 (sync v2) · $2,10 (VEED) · $0,75–1,50 (HeyGen) | https://fal.ai/models/fal-ai/sync-lipsync/v2, `docs/api-verification.md`, `docs/vendors/heygen/capabilities.md` |
| Ondertitels en 9:16 | Shotstack `rich-caption` + `aspectRatio: "9:16"` | ≈ $0,10 | `docs/vendors/shotstack/capabilities.md` |

- **Voordelen:** volledige controle over de tekst (toon, lengte, CTA erin), vrije stemkeuze (eigen kloon of catalogusstem), elke bouwsteen los vervangbaar.
- **Nadelen:** de moeilijkste stap is niet vertalen maar **timing**: vertaalde zinnen zijn langer of korter dan het origineel, dus spraak moet per segment worden gegenereerd en gepast, anders loopt lipsync vast. HeyGen lost dat intern op (`enable_dynamic_duration`); wij zouden het zelf bouwen. Daarnaast vier leveranciers in één keten, elk met eigen limieten en tijdelijke URL's.
- **Kosten:** eerste video ≈ $3,20 (inclusief $1,50 stemkloon), daarna ≈ $1,70 per 30 s met sync-lipsync, of ≈ $1,00 met HeyGen-lipsync.

### Optie 3 (optionele laatste stap): videoverbetering

| Dienst | Wat | Kosten per 30 s | Opmerking |
|---|---|---|---|
| Vmake API (Plus/Pro) `hdvideoallinone` | kwaliteitsverbetering, upscaling | niet gepubliceerd (achter login), HMAC-signing | enige echte Vmake-API-functie; zie `docs/api-verification.md` |
| fal.ai `fal-ai/topaz/upscale/video` | Topaz Proteus: upscale tot 8×, ruis/compressie herstel, frame-interpolatie | $0,01/s tot 720p, $0,02/s tot 1080p ⇒ $0,30–0,60 | https://fal.ai/models/fal-ai/topaz/upscale/video |
| fal.ai `fal-ai/flashvsr/upscale/video` | snelle upscaler | $0,0005 per megapixel-frame ⇒ ≈ $0,75 voor 30 s 1080p | https://fal.ai/models/fal-ai/flashvsr/upscale/video |
| fal.ai `fal-ai/seedvr/upscale/video` | hoge kwaliteit upscaler | $0,001 per megapixel-frame ⇒ ≈ $1,50 | https://fal.ai/models/fal-ai/seedvr/upscale/video |

Aanbeveling voor deze stap: **Topaz via fal.ai** (goedkoopst, één sleutel die we al hebben, gedocumenteerde prijs). Alleen aanbieden als keuze "Verbeter beeldkwaliteit", niet standaard: het verdubbelt de verwerkingstijd en is bij goed bronmateriaal zinloos. Geen watermerk-verwijdering.

### Vergelijking

| | Optie 1: HeyGen + proofread + Claude-herschrijving | Optie 2: eigen pipeline |
|---|---|---|
| Kwaliteit | Stem en lipsync van één leverancier, op elkaar afgestemd; precision voor eindproduct | Afhankelijk van de zwakste schakel; timing is het risico |
| Controle over tekst | Ja, via SRT-correctie (Claude + gebruiker) | Volledig |
| Controle over stem | Alleen de gekloonde stem van de spreker (of Enterprise stock voice) | Vrij: kloon of catalogus |
| Kosten per 30 s | ≈ $1,00 (speed) tot $1,75 (precision), incl. ondertitels | ≈ $1,70 (eerste video $3,20) |
| Complexiteit | Laag: 5 aanroepen bij één leverancier plus Shotstack | Hoog: 6 stappen, 4 leveranciers, eigen audio-assemblage |
| Bouwtijd | Dagen | Weken |

### Aanbeveling

**Optie 1 als Workflow B, met Claude in de proofread-stap.** Dat geeft de controle die we willen (vertaling in advertentietoon, correctie door de gebruiker) tegen de laagste complexiteit en kosten, en het hergebruikt de HeyGen-koppeling en de cost guard die al bestaan. Shotstack doet daarna ondertitels in TikTok-stijl en 9:16, net als in Workflow A. Verbetering via Topaz als optionele knop.

Optie 2 bewaren we voor het geval HeyGen tegenvalt op één van twee punten: de proofread-stap blijkt toch Enterprise-only (dan vervalt de tekstcontrole), of de stemkwaliteit voldoet niet. Omdat lipsync en TTS achter dezelfde interface kunnen zitten als Workflow A (`src/lib/services/`), is die overstap per bouwsteen te doen.

### Stand van zaken (20 oktober 2026)

- **Reviewstap verwijderd** (20 okt 2026): de workflow is Upload → Translate → Captions and 9:16. Een automatische kwaliteitscontrole (Sonnet, ≈ $0,01 per taal) vergelijkt elke regel met de brontranscriptie en corrigeert ontbrekende of toegevoegde woorden, betekenisfouten, cijfers, namen en onnatuurlijke zinnen; wijzigingen en waarschuwingen staan op de projectpagina. De gecorrigeerde SRT gaat vóór de betaalde render terug naar de dienst (bestaande PUT-route). Zonder bekende brontaal (automatische detectie) controleert het model alleen de doeltekst.
- **Taalkeuzes:** brontaal met "Detect automatically" vooraf geselecteerd en alle talen doorzoekbaar; doeltalen uit de live lijst van de dienst (190, met regiovarianten), doorzoekbaar, meest gebruikte eerst; dezelfde taal als bron en doel wordt geweigerd.
- **Termen bewaren** via brand glossary (gratis). **Stilte knippen** (standaard aan) en **ondertitelpositie** (Low/Middle) in de montage. **Snelheid:** polls 8 s, taalversies parallel.
- **Aannames (20 okt):** de proofread accepteert `brand_glossary_id` (staat in de referentie; nog niet betaald getest); prijzen per minuut zijn ons tarief ($1,50 speed, $3 precision per taal), de documentatie noemt geen prijs; stilte wordt uit ondertiteltijden afgeleid, niet uit het geluid.


### Layout, bouwstappen 1–4 (20 oktober 2026)

Uit `docs/research/layout-research.md` (vergelijking met Creatify en MakeUGC) zijn de eerste vier verbeteringen gebouwd: resultaat bovenaan op de projectpagina met het werkelijke bedrag en een ingeklapte pijplijn; aanbevolen lengte en kwaliteit gemarkeerd, 9:16 uitgelegd, schatting op de knop en in een bevestiging vlak voor de start; kiezer op `/new` met eigen voorbeeld, gemeten wachttijd en startprijs; projectenlijst met soortfilter en soortlabel. Nog open uit dat document: advertentieformulier in drie blokken met vaste samenvatting (5), dashboard-uitleg per workflow (6), Settings → Merk (7), opnieuw renderen vanaf het resultaat (8).
### Stand van zaken (19 oktober 2026)
- **Deel 1 (gebouwd, demo mode):** keuzescherm op `/new`, formulier `/new/translate` (upload met preview, 32 MB-melding vóór upload, brontaal, vijf doeltalen, speed/precision met kostenindicatie, verplicht rechtenvinkje), projectpagina met pipeline Upload → Vertalen → Correctie (wacht op de gebruiker) → Ondertitels en 9:16, correctiescherm met origineel naast vertaling, tekenlimiet per fragment (15 tekens/s), "Herschrijf in advertentietoon", één resultaat per taal.
- **Deel 2 (gebouwd, echte koppelingen op `/dev/translate`):** `src/lib/services/translate.ts` (HeyGen assets, talen, proofread-sessie, SRT ophalen/terugzetten, genereren, status, SRT-parser), `src/lib/services/adTone.ts` (Claude herschrijft binnen de tekenlimiet, zelfde aantal fragmenten en tijden), `buildCaptionEdit` in `finalEdit.ts` (Shotstack captions uit HeyGens SRT + 9:16). Alle betaalde routes via de cost guard met bevestiging; rechtenvinkje verplicht op elke route.
- **Gratis geverifieerd:** HeyGen talenlijst (190 namen, onze vijf aanwezig), asset-upload van video en SRT, Shotstack-sandboxrender van captions met en zonder SRT.
- **Wacht op saldo (eerste betaalde test):** proofread zonder Enterprise, brontaal als extra doeltaal voor de originele tekst, werkelijke kosten per taal, kwaliteit van stem en lipsync.

### Eerste verificatie (voor de bouw, met de cost guard aan)
1. Eén proofread-sessie op het pay-as-you-go-account: bevestigt of proofread zonder Enterprise werkt en wat het kost (saldoverschil).
2. Eén vertaling in speed-modus van een clip van 20 s naar Duits, met glossary voor de productnaam.
3. Dezelfde clip door Topaz op 720p; vergelijk beeld en kosten.

## Vaste regel: alleen ondertitels in beeld (19 oktober 2026)

Na de eerste volledige run (26 s, Madison-jurk, Standard) bleek de video druk door tekst in beeld. Besluit: **het enige wat er aan tekst in beeld staat zijn de ondertitels onder in beeld, over de hele video, in de gekozen ondertitelstijl.** Geen hook-vak, geen voordeel-labels, geen eindkaart, geen knop, geen andere tekst-overlay. Hook, voordelen en oproep tot actie zijn gesproken tekst en verschijnen alleen als gewone ondertitel. Het logo van de klant (rechtsboven, optioneel) blijft. Deze regel staat ook in CLAUDE.md en wordt nooit teruggedraaid zonder expliciete opdracht.

## Instellingen die het resultaat bepalen (inventarisatie 19 oktober 2026)

Per stap: wat het is, waar het vandaan komt, effect op kwaliteit en kosten, of het nu vast of kiesbaar is, en het advies. Tijs beslist hierna wat de klant mag kiezen. Bronnen: developers.heygen.com (create-video, list-avatar-looks, list-voices, avatar-iv, avatar-from-photo, background-music, brand-kits), fal.ai-modelpagina's, shotstack.io-docs, onze eigen code.

### Presentator (HeyGen)

| Instelling | Wat / waar vandaan | Kwaliteit | Kosten | Nu | Advies |
|---|---|---|---|---|---|
| Look (avatar) | `GET /v3/avatars/looks` (`id`, `name`, `avatar_type`, `preferred_orientation`, `image_width/height`, `tags`); alleen staande looks bruikbaar | Bepaalt gezicht, kleding, decor; grootste indruk op de klant | Geen | **Gebouwd** (19 okt 2026): picker op `/new/ad` (stap "Your presenter"), staande looks die de gekozen kwaliteit ondersteunen, 6 gecureerde looks eerst, "More presenters" met paginering; standaard Olivia (`HEYGEN_DEFAULT_LOOK_ID`); keuze opgeslagen als `AdInput.lookId` | Klant kiest (gebouwd) |
| Geslacht | `gender` op look en groep | Past bij doelgroep | Geen | Filter All / Women / Men in de picker (gebouwd) | Filter, geen los veld |
| Stem | `GET /v3/voices` (`language`, `gender`, `preview_audio_url`, `available_engines`); geen locale-veld (`support_locale` is false op alle 2.644 publieke stemmen) | Groot: toon en accent bepalen geloofwaardigheid | Geen | **Gebouwd**: keuze "Voice" op `/new/ad`, gefilterd op taal + accent + geslacht van de look, voorgeselecteerd op de default-stem van de look als die bij de taal past; luistervoorbeeld (één tegelijk); `pickVoice()` controleert vóór de betaalde stap dat de stem bestaat en de taal spreekt | Klant kiest (gebouwd) |
| Taal | Eén keuze "Language" (talen met stemmen: en, nl, de, fr, es, it, pt, sk) bepaalt script, ondertitels en stem; `AD_LANGUAGE` is alleen de beginwaarde | Moet gelijk zijn voor script, ondertitels en stem | Geen | **Gebouwd**; geen hard filter op "English" meer | Klant kiest (gebouwd) |
| Accent / regio | Uit de stemnamen (bv. "US", "British", "Vlaams", "Brazil"), omdat de API geen locale per stem geeft; alleen getoond als er stemmen zijn (Engels: US, UK, Indian; Nederlands: Vlaams; Portugees: Brazil); spelling volgt het accent in het script | Herkenbaarheid in de markt | Geen | **Gebouwd** (aanname: naam-gebaseerd, `voice_settings.locale` wordt niet gestuurd omdat geen publieke stem het ondersteunt) | Klant kiest waar beschikbaar |
| Tempo | `voice_settings.speed` 0,5–1,5; drie standen Slower 0,9 / Normal 1 / Faster 1,1 | Leesbaarheid en energie | Langere video bij Slower (÷0,9) en kortere bij Faster (÷1,1); de schatting rekent presentator en ondertitels op seconden ÷ snelheid; de woordgrens blijft die van normaal tempo | **Gebouwd**, standaard Normal | Klant kiest (gebouwd) |
| Toonhoogte, volume | `voice_settings.pitch` −50…+50, `volume` 0–1 | Zelden nuttig | Geen | Niet meegestuurd | Bewust niet (besluit 19 okt 2026) |
| Engine | `engine.type` `avatar_iii | avatar_iv | avatar_v`; look moet hem ondersteunen | IV: natuurlijke beweging; III: stijver | Lijst $0,05/s vs $0,0083/s; gemeten ≈ $0,033 vs $0,017/s | Kiesbaar: Standard/Premium op `/new/ad` (gebouwd) | Klant laat kiezen (besloten) |
| Resolutie | `resolution` `720p | 1080p | 4k` (4k alleen Avatar III twins/studio) | Staande twins zijn 720×1280 van zichzelf; 1080p is opgeschaald | Geen toeslag | Vast 1080p | Vast 1080p |
| Achtergrond | `background.type: color` (`value` hex) of `image` (`url`/`asset_id`); geen video (create-video.md, 19 okt 2026) | Effen kleur of eigen foto achter de presentator | Geen | **Gebouwd**: keuze in "Your presenter" (eigen van de look, 5 kleuren, eigen afbeelding); opgeslagen als `AdInput.background` | Klant kiest (gebouwd) |
| remove_background | Top-level `remove_background`; "Video avatars must be trained with matting enabled"; de API geeft per look niet aan of matting aan staat | Nodig om de achtergrond écht te vervangen | Geen vermeld | **Gebouwd met vangnet**: wordt meegestuurd zodra een achtergrond gekozen is; antwoordt HeyGen 400, dan behoudt de run de eigen achtergrond en toont de presentatorstap een waarschuwing | Automatisch |
| Captions | `caption.file_format: srt`, `style: default`; SRT altijd via `subtitle_url` | Shotstack maakt onze captions; HeyGen-SRT is exacter | Geen | Uit; Shotstack transcribeert | Later: HeyGen-SRT doorgeven aan Shotstack (zoals Workflow B) |
| Beweging / expressiviteit | `motion_prompt` en `expressiveness` `low | medium | high`: alleen foto-avatars; geweigerd voor video-avatars op IV | Alleen relevant als we foto-avatars gebruiken | Geen | N.v.t. | Later, alleen bij eigen foto-avatar |
| Eigen foto-avatar | `POST /v3/avatars` `type: photo`; pollen op look-status | De klant als presentator | Kosten niet in de documentatie; navragen | Niet gebouwd | Later; toestemming vastleggen (geen consentstap bij HeyGen) |
| Publiek vs eigen | `ownership=public|private`; groep heeft `consent_status` | Eigen digital twin vereist opname en consent | Betaald plan | Alleen publiek | Publiek voor de MVP |
| Looks per taal/regio | Bestaat niet: looks en groepen hebben geen taal- of regioveld | – | – | – | Stem bepaalt de taal, niet de look |
| fit | `fit` `cover | contain`; zonder veld kiest HeyGen | Bepaalt balken of vullen | Geen | `cover` meegestuurd (gebouwd); liggende looks geweigerd | Vast |

### Script (Claude)

| Instelling | Wat / waar vandaan | Kwaliteit | Kosten | Nu | Advies |
|---|---|---|---|---|---|
| Taal | `AD_LANGUAGE` → prompt; stem moet erbij passen | Moet kloppen met markt en stem | Geen | **Gebouwd**: keuze op `/new/ad` (Slowaaks/Duits/Frans/Nederlands/Engels), standaard `AD_LANGUAGE`; opgeslagen als `AdInput.language` | Klant kiest (gebouwd); de stem bij die taal komt in de stemprompt |
| Invalshoek | `angle` in `ScriptInput` (`problem_solution`; UGC en demo in het schema voorbereid) | Groot verschil in toon en opbouw | Geen (zelfde aanroep) | Vast problem/solution | Later kiesbaar (U1) |
| Toon | Vaste lijst Elegant / Playful / Direct / Warm → regel in het systeemprompt (`TONE_META`) | Stuurt woordkeuze en ritme | Geen | **Gebouwd**, standaard Direct (de oude toon) | Klant kiest (gebouwd) |
| Richting | Vrij veld "Direction" (max 200 tekens), als data in het prompt | Doelgroep en nadruk | Geen | **Gebouwd** | Klant vult in (gebouwd) |
| Lengte | `AD_LENGTHS` 10/20/30/45/60 s → woordgrens | Bepaalt alles; 10 s = alleen hook, product, CTA | Grootste kostenknop (presentator per seconde) | Kiesbaar (gebouwd) | Klant kiest (besloten) |
| Aanbod / CTA | Veld "Offer" (max 80 tekens); het script gebruikt het in de CTA en noemt zonder veld geen korting of urgentie | Echte korting of bundel maakt de eindkaart sterker | Geen | **Gebouwd** (S2) | Klant vult in (gebouwd) |
| Doelgroep | Onderdeel van "Direction" | Richt hook en voorbeelden | Geen | Gebouwd via Direction | – |
| Hooks | Schema levert 3 hooks; `hook` = de gekozen | Keuze uit drie invalshoeken voor de eerste 2 s | ≈ +60 uitvoertokens ≈ $0,001 per script (Opus) | **Gebouwd**; zonder review wordt de eerste gebruikt | Klant kiest bij review (gebouwd) |
| Review script first | Pauze na het script (stap "needs_input", project "review"), goedkeuren via `POST /api/projects/{id}/script`, event `project/ad-script.approved`; retry van latere stappen slaat de pauze over zodra `approvedAt` staat | Klant ziet en corrigeert de tekst vóór de dure stappen | Geen extra kosten; voorkomt mislukte dure stappen | **Gebouwd**, standaard uit | Klant kiest (gebouwd) |
| Model | `model` op `/dev/script` (Opus/Sonnet/Haiku) | Opus duidelijk beter in de test | $0,02 vs $0,01 vs $0,001 | Vast Opus 5.5 | Vast; klant hoeft dit niet te zien |

### Productclip (fal.ai)

| Instelling | Wat / waar vandaan | Kwaliteit | Kosten | Nu | Advies |
|---|---|---|---|---|---|
| Model | `CLIP_MODELS` (MiniMax 768p/Turbo 1080p, Kling v3 Standard 720p/Pro) | Productdetails en resolutie verschillen | $0,26–$0,56 per clip | Vast op datum (`PRODUCT_CLIP_MODEL`) | Vast; na de vergelijkingstest één standaard |
| Duur | `duration` 5 s (MiniMax 5–15, Kling 3–15) | Langer = meer afwisseling, maar één clip wordt hergebruikt | Lineair per seconde | Vast 5 s | Vast 5 s |
| Bewegingsprompt | `clipPrompt()` uit productnaam, `mood`, persoon ja/nee | Camera en beweging; product blijft gelijk | Geen | Automatisch | Vast; alleen op `/dev` overschrijfbaar |
| Foto aanvullen | Bria Expand als het product niet in 9:16 past | Voorkomt afgesneden product | $0,04 | Automatisch | Vast (automatisch) |

### Montage (Shotstack)

| Instelling | Wat / waar vandaan | Kwaliteit | Kosten | Nu | Advies |
|---|---|---|---|---|---|
| Muziek | **Bewust niet gebouwd** (19 okt 2026). HeyGen `GET /v3/audio/sounds`: catalogus met zoeken in gewone taal, `duration`, tijdelijke WAV; prijs en licentie staan niet in de documentatie. Shotstack: geen muziekbibliotheek; wel AI-muziek (`elevenlabs-music`, per begonnen minuut, bedrag en licentie niet op de prijspagina) en eigen audiobestanden (`audio`-asset met `src`, `volume`, `effect`). | Sfeer | Onbekend | Vast `sample-music.mp3` | Open vragen aan HeyGen en Shotstack: prijs per track/minuut en of de licentie betaalde advertenties dekt. Tot die antwoorden: één eigen gelicentieerde track |
| Ondertitelstijl | Shotstack `rich-caption`: animatie `pop | fade | karaoke`, `active` kleur, stroke; over de hele video, onder in beeld | De enige tekst in beeld | Geen | **Gebouwd**: Bold pop (standaard), Clean, Karaoke | Klant kiest (gebouwd) |
| Lettertype | Ingebouwde Shotstack-families (rich-text.md): Roboto, Montserrat, Open Sans, Work Sans (uit de lijst van 11); eigen fonts via `timeline.fonts[].src` | Merkgevoel | Geen | **Gebouwd**: vaste lijst van 4, standaard Roboto | Klant kiest (gebouwd); eigen font later |
| Logo | `image`-clip, `scale` 0,14, `position: topRight`, `offset` (positioning.md) | Merkherkenning | Geen | **Gebouwd**: optionele upload (asset kind `logo`), hele video rechtsboven | Klant uploadt (gebouwd) |
| Hook-vak, voordeel-labels, eindkaart, knop | Waren `rich-text`-clips in `buildAdEdit` | Maakten de video druk en onrustig | Geen | **Bewust verwijderd** (19 okt 2026): zie de vaste regel hierboven; hook, voordelen en CTA zijn gesproken | Niet terugbouwen zonder opdracht |
| Beweging productbeelden | Per overlay een eigen camerabeweging en uitsnede (`OVERLAY_MOTIONS` in `adLayout.ts`: langzame zoom in/uit, pan omhoog/omlaag/links met `scale` + `offset`), oneven overlays tonen de voorbereide productfoto met een langzame pan; overgangen 0,5 s fade of slide (Shotstack `Fast`-varianten), `opacity` 1, productclip gemuted; presentatorspoor loopt ononderbroken door | Rustiger beeld, geen harde sneden, geen doorschemeren | Geen | **Gebouwd**, alleen via het sjabloon gecontroleerd | Vast |
| Accentkleur | `colors.accent` in `buildAdEdit`; kleurt nu alleen het actieve ondertitelwoord; contrast met wit gecontroleerd | Merkkleur | Geen | **Gebouwd**: 6 kleuren of eigen hex | Klant kiest (gebouwd) |

**Niet toegevoegd (bewust, 19 okt 2026):** model, duur en prompt van de productclip; toonhoogte en volume van de stem; expressiveness en motion prompt; eigen foto-avatars; muziek (open vragen hierboven).

**Controle stemmen en default-stem:** de orchestrator gebruikt `HEYGEN_DEFAULT_VOICE_ID`, anders `default_voice_id` van de gekozen look (komt mee in de looks-lijst, bij de staande kandidaten is hij gevuld), anders de eerste stem uit `GET /v3/voices?language=English`. Die lijst filtert op "English", niet op `AD_LANGUAGE`; zolang `AD_LANGUAGE` `en` is klopt dat, maar bij een andere taal moet de stemkeuze aan de taal gekoppeld worden.

## Ideeën (uitgezocht op 19 oktober 2026, niet gebouwd)

### a) Tweede productclip voor langere advertenties

Nu wordt één clip van 5 s hergebruikt (verschillende stukken, bewegingen en uitsneden, plus de voorbereide productfoto als stilstaand beeld). Een tweede clip kost één extra fal.ai-aanroep: MiniMax Turbo 1080p $0,26 tot 31 oktober, daarna $0,40; Kling v3 Standard $0,42 (bron: fal.ai-modelpagina's, `docs/cost-quality.md` §2).

| Lengte | Productmomenten nu | Totaal nu (Premium) | Met tweede clip | Oordeel |
|---|---|---|---|---|
| 10 s | 1 | $0,86 | $1,12 | Niet zinvol: één moment |
| 20 s | 2 | $1,40 | $1,66 (over budget) | Niet zinvol binnen $1,50 |
| 30 s | 2 | $1,93 | $2,19 | Mogelijk, alleen als het budget per lengte meegroeit (§13) |
| 45 s | 3 | $2,73 | $2,99 | Zinvol: drie momenten uit één clip wordt herhalend |
| 60 s | 4 | $3,53 | $3,79 | Zinvol; eventueel een derde clip ($4,05) |

Wat het oplevert: echt ander beeld (een tweede foto of hoek) in plaats van dezelfde clip opnieuw. Advies: pas inbouwen bij 45 en 60 s, nadat het budget voor lange video's is besloten; tot dan is de gratis variatie (bewegingen, uitsneden, foto-stills) de oplossing. Vereist: een tweede productfoto als startbeeld en een tweede paid clip-reservering in de orchestrator.

### b) Productidee: bestaande video alleen vertalen, ondertitelen en lipsyncen

Dit is in de kern Workflow B zoals al gebouwd (`src/lib/inngest/functions/translateWorkflow.ts`, `/new/translate`): upload → HeyGen video-vertaling met proofread → optionele review → render met lipsync → Shotstack-ondertitels in 9:16 of het eigen formaat. Wat we al weten (HeyGen-vendordoc §4, roadmap "Workflow B"):

- **Kosten per minuut per doeltaal:** speed 0,05 credit/s ≈ $1,50/min, precision 0,1 credit/s ≈ $3/min (betere lipsync); proofread 0,00833 credit/s ≈ $0,25/min per taal (plus één extra proofread voor het transcript van de brontaal). Ondertitels en formaat via Shotstack $0,10 per 30 s. Per taalversie van 30 s: speed $1,05–$1,11, precision $1,80–$1,86 (cost-quality §8).
- **Ondertitels:** HeyGen levert SRT en VTT (`srt_caption_url`); Shotstack brandt ze in met onze drie stijlen en de merkkleur (zelfde `rich-caption` als Workflow A), dus stijl, kleur en lettertype zijn deelbaar.
- **Limieten:** upload tot 32 MB in één call, tot 200 MiB via direct-uploads (niet gebouwd); onze UI begrenst op 32 MB en 180 s (`config.limits`). Een maximale videoduur voor vertaling noemt HeyGen niet apart; de algemene grens is 30 minuten per video (usage-limits).
- **Talen en accenten:** `GET /v3/video-translations/languages` geeft 190 namen inclusief regiovarianten (bv. "Arabic (Egypt)"); de gekloonde stem van de spreker blijft, dus accentkeuze is hier een taalvariant, geen stemkeuze.
- **Kwaliteit en beperkingen:** speed-modus toont bij close-ups zichtbaar mindere lipsync; precision is 2× zo duur en trager (≈ 5 min per minuut video); ingebrande tekst in de bronvideo wordt niet vertaald; muziek kan uitgezet worden (`disable_music_track`).
- **Wat de klant nodig heeft:** rechten op de video en toestemming van de spreker (regel 7: verplicht vinkje, met tijdstempel opgeslagen); geen watermerkverwijdering.

Naast Workflow A: **gedeeld** zijn upload via signed URLs, opslag, de cost guard en het budget per taalversie, de reviewstap, de ondertitelstijlen en merkkleur, taal- en accentlijst, en de projectpagina met één resultaat per taal. **Apart** zijn de stem (gekloond uit de bron, geen stemkeuze), het script (geen generatie, alleen correctie/herschrijving), en de productclip en presentator (niet van toepassing).

Aanbeveling: de goedkoopste, simpelste eerste versie bestaat al bijna: Workflow B in speed-modus zonder beeldverbetering, met ondertitels in de bestaande stijl, voor $1,05–$1,11 per taal van 30 s. Nog te doen: dezelfde ondertitelstijl- en merkkeuzes als Workflow A op `/new/translate` zetten, en de eerste betaalde proofread-test (wacht op HeyGen-tegoed). Het volgende logische besluit: of dit als apart, goedkoper product ("vertaal mijn video") naast de advertentie-workflow wordt aangeboden, en tegen welke prijs per taal.

### c) Workflow B sneller of goedkoper, met kwaliteits- of kostenrisico (niet doorgevoerd, 20 okt 2026)

| Idee | Verwachte tijdwinst | Kwaliteitsverlies of risico |
|---|---|---|
| Webhooks in plaats van polling (stage8-plan stap 8) | ≈ 8–20 s per wachtmoment, 3 momenten per taal | Geen; vereist een publieke URL (tunnel of deployment), dus pas bij deployment |
| Speed-modus afdwingen in plaats van Precision | ≈ 50% kortere vertaaltijd | Minder realistische lipsync bij bewegende gezichten; keuze blijft bij de klant |
| Lagere renderresolutie bij Shotstack (720p) | ≈ 20–30% kortere ondertitelrender | Zachter beeld op 1080×1920-schermen; niet doen |
| Geen brontranscript aanvragen (bespaart één proofread ≈ $0,03 en ≈ 0–20 s) | klein | De controle kan dan niet met de bron vergelijken; niet doen |
| Volume normaliseren naar social-niveau (eerste resultaat ≈ −30 dB) | – | Kan niet met de huidige API's (Shotstack volume 0–1, geen loudness-normalisatie; HeyGen geen optie). Idee: nabewerking met ffmpeg `loudnorm` (−14 LUFS) op een eigen worker, ≈ $0 maar vereist een server met ffmpeg |

## Bevestigingstest HeyGen-tarieven (nog te doen, ≈ $0,60)

Doel: het tarief per seconde van Avatar IV en III meten op een lengte waar centen-afronding er niet toe doet. Eén staande look die beide engines ondersteunt (kandidaten in de HeyGen-vendordoc), één script van ongeveer 10 s (≈ 25 woorden), eerst Avatar IV en daarna Avatar III met dezelfde look, stem en tekst; tarief = saldoverschil ÷ `duration` uit `GET /v3/videos/{id}`. Verwacht op lijsttarief $0,50 + $0,08; op het gemeten tarief $0,33 + $0,17. Daarna `presenterUsdPerSecond` in `src/lib/pricing.ts` bijwerken en de kostentabel in docs/cost-quality.md §8 opnieuw berekenen.

## Accounts en sleutels die Tijs zelf aanmaakt

Alle sleutels komen in `.env.local` (zie `.env.example`), nooit in code, commits of chat.

| Dienst | Account | Sleutel | Kosten om te starten |
|---|---|---|---|
| Anthropic | Console-account op platform.claude.com, tegoed toevoegen | `ANTHROPIC_API_KEY` | Pay-as-you-go; enkele dollars volstaan voor fase 7. |
| HeyGen | Bestaand of nieuw HeyGen-account; API-credits kopen; sleutel op `https://platform.heygen.com/api-keys` | `HEYGEN_API_KEY` | Pay-as-you-go, geen gratis API-credits meer; reken op ~$4 per minuut video. Vraag HeyGen vooraf of pay-as-you-go-output watermerkvrij en commercieel bruikbaar is op jouw plan. |
| fal.ai | Account, tegoed, sleutel in het dashboard | `FAL_KEY` | Pay-as-you-go, cents per clip. |
| Shotstack | Account; sandbox-sleutel uit het dashboard | `SHOTSTACK_API_KEY`, `SHOTSTACK_ENV=stage` | Gratis sandbox met 10 credits; productie vanaf $10 pay-as-you-go. |
| Creatomate (reserve) | Alleen als Shotstack in de praktijk tekortschiet | `CREATOMATE_API_KEY` | Proefperiode met 50 credits. |

Daarnaast, niet voor de eerste koppeling maar voor fase 8: een database, bestandsopslag en een plek voor achtergrondjobs. Die keuze maken we dan.
