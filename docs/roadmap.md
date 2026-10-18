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
