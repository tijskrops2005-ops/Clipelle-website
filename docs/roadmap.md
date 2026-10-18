# Roadmap: van productfoto naar 9:16-advertentie

Datum: 18 oktober 2026. Dit document vervangt de keten "Vmake → HeyGen → VEED" uit `docs/master-prompt.md`. Het proces blijft, de diensten zijn gekozen op basis van `docs/api-verification.md`: alleen diensten met een gedocumenteerde, self-serve API.

## Het proces dat de app automatiseert

```
1  Invoer         productfoto's + productinformatie (naam, beschrijving, URL, doelgroep)
2  Script         hook + script per invalshoek (problem/solution, UGC/testimonial, product demo)
3  Productclip    B-roll uit de productfoto (9:16, 5–10 s)
4  Presentator    AI-presentator spreekt het script uit (9:16)
5  Montage        hook (0–2 s) → presentator → productbeelden → voordelen → aanbod + CTA,
                  met ondertitels en muziek, als 9:16 MP4
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

Doel: een gebruiker vult het formulier in, kiest niets extra's, en krijgt één afgeronde advertentie van 20–35 seconden in de invalshoek "problem/solution" met één standaardpresentator en één standaardmuziektrack.

| # | Stap | Wat het oplevert | Dienst | Wat Tijs vooraf regelt |
|---|---|---|---|---|
| M1 | Script | JSON met `hook`, `scenes[]` (tekst per scène), `benefits[]`, `offer`, `cta`, `presenterScript`; gegenereerd uit naam, beschrijving, URL en de eerste foto (Claude kijkt naar de foto). | Claude API | Anthropic Console-account, tegoed, sleutel `ANTHROPIC_API_KEY`. |
| M2 | Productclip | 9:16 MP4 van 5–10 s uit de eerste foto, met een prompt afgeleid uit het script. | fal.ai | fal.ai-account, tegoed, sleutel `FAL_KEY`. |
| M3 | Presentator | 9:16 MP4 waarin de standaardavatar `presenterScript` uitspreekt; SRT-ondertitels meegeleverd. | HeyGen v3 | HeyGen-account, API-credits, sleutel `HEYGEN_API_KEY`, webhook-endpoint geregistreerd. |
| M4 | Montage | 9:16 MP4: hook-tekst over de productclip (0–2 s), presentator, productclip met voordelen als tekst, eindkaart met aanbod en CTA; ondertitels; muziek eronder. | Shotstack (reserve Creatomate) | Shotstack-account, sandbox-sleutel `SHOTSTACK_API_KEY`; één rechtenvrije muziektrack met licentie in onze opslag. |
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
| Templates (Studio-lay-out met `text`-, `video`-, `audio`-, `character`-variabelen en captions) | **MVP-kandidaat voor de montage, te testen naast Shotstack** | De enige HeyGen-route waarin hook-tekst, productclip, presentator, muziek en captions in één render samenkomen. Winst: één leverancier minder. Risico: sjabloon handmatig in Studio bouwen, prijs niet vermeld. Beslissing in fase 7 na een test met één sjabloon. |
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
| HyperFrames (HTML-compositie, cloud-render ≈ $0,05/min) | **Reserve voor de montage** | Volwaardig alternatief voor Shotstack met volledige controle en lage renderprijs, maar wij schrijven de compositie zelf. Overwegen als Shotstack én templates tegenvallen. |
| Video Agent (prompt → complete video, ≈ $2/min) | **Experiment, niet in de keten** | Kan in één call een hele advertentie maken met captions en graphics, maar zonder onze vaste opbouw. Nuttig om ideeën te zien; niet als fundament, omdat we hook/voordelen/CTA zelf willen sturen. |
| Brand kit (kleuren, fonts, logo) | **Niet nodig** | Werkt alleen met Video Agent. Onze merkstijl gaat via het montagesjabloon (U6). |
| Bestaande video bewerken (`edit_plan`, scènes) | **Niet nodig** | Wij regenereren liever een stap met Retry dan dat we scènes bewerken; past ook alleen bij Video Agent-sessies. |
| Lipsync (nieuwe audio op bestaande video) | **Niet nodig** | Alleen nuttig als we één presentatorbeeld met wisselende voice-overs willen hergebruiken; vertaling dekt dat beter. |
| AI clipping, filler-word removal, transcriptie, podcasts, custom agents, realtime avatar, beeldgeneratie, quality comparison | **Niet nodig** | Buiten het advertentieproces. Quality comparison hooguit intern om engines te vergelijken. |
| Durable workflows (`/v3/workflows`) | **Niet nodig** | Orkestreert alleen HeyGen-stappen; onze keten bevat ook Claude, fal.ai en de montagedienst, dus de orchestrator blijft bij ons (fase 8). |
| API-sleutel met scopes | **MVP** | Productie-sleutel beperken tot `videos:write`, `videos:read`, `avatars:read`, `voices:read`, `account:read`, `webhooks:write`; uitbreiden per functie. |
| Assets-upload (`POST /v3/assets`) | **Uitbreiding U7** | Nodig zodra we een productfoto als achtergrond of een eigen foto-avatar meesturen; publieke URL's uit eigen opslag volstaan in de MVP. |

**Gevolg voor de MVP-keuze van de montagedienst:** fase 7, stap 4 test eerst een HeyGen-template (hook-tekst, productclip als `video`-variabele, presentator als `character`, muziek als `audio`, CTA-tekst, captions) naast Shotstack. Werkt het sjabloon goed en is de prijs acceptabel, dan wordt HeyGen de montagedienst en vervalt Shotstack; anders blijft Shotstack met HyperFrames als reserve.

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
