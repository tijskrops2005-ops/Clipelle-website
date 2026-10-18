# API-verificatie (fase 6)

Datum: 18 oktober 2026. Onderzocht via de officiële documentatie en helpcentra van Vmake, HeyGen en VEED, plus een beperkte check van alternatieven. Er is niets aangemaakt, nergens ingelogd en niets gekocht. Pagina's achter een login zijn als "niet verifieerbaar" gemarkeerd.

Elke bewering hieronder heeft een bron-URL. Waar iets niet gevonden is, staat **niet gevonden**. Er zijn geen endpoints verzonnen.

## Oordeel in één oogopslag

| Dienst | Onze stap | Oordeel | Kern |
|---|---|---|---|
| **Vmake** | productfoto → productvideo | **Niet via API** | Er is een API, maar die dekt alleen watermerk-verwijdering en beeldverbetering. Productvideo/UGC is uitsluitend een website-functie. |
| **HeyGen** | script → AI-presentator | **Werkt via API** | Volwaardige, self-serve v3-API: avatars, stemmen, 9:16, productfoto als achtergrond, captions, webhooks, vertaling. Let op: v1/v2 stoppen op 31 oktober 2026. |
| **VEED** | clips samenvoegen + captions + muziek + CTA → 9:16 | **Niet via API** (deels voor captions) | De API bevat alleen AI-modellen (Fabric, Lipsync, achtergrond-verwijdering, audio-opschoning). VEED zelf: "we currently don't offer an API for the full editor." Alleen ondertitels op één clip kunnen via de VEED Subtitles API op fal.ai. |

**Gevolg:** de oorspronkelijke keten Vmake → HeyGen → VEED is niet bouwbaar zoals bedacht. HeyGen blijft, de andere twee stappen krijgen een andere leverancier. Het principe (één invoer, drie automatische stappen, één video) blijft overeind. Het voorstel staat onderaan.

---

## 1. Vmake

**Oordeel: niet via API voor onze stap.**

### Bestaat er een API en hoe krijg je toegang?
- Ja. Het Resources-menu linkt naar "API" → `https://vmake.ai/developers`, titel "Vmake Labs API for Any AI Model", met tabs Home / Dashboard / API Keys / Pricing / Doc.
- Toegang: "A Plus or Pro membership is required to create API keys and call the API." Geen apart API-plan, geen wachtlijst, geen enterprise-only. (https://vmake.ai/developers)
- Prijzen: "Image API calls deduct credits per image; video API calls deduct credits per second." De tabel met bedragen laadt pas na inloggen: **niet verifieerbaar**. Plannen: Free "20 credits daily", Plus "1000 credits/month", Pro "4500 credits/month"; dollarprijzen worden client-side geladen: **niet gevonden**. (https://vmake.ai/pricing)
- Er is een banner "legacy API is no longer maintained"; overstappen naar de nieuwe API is onomkeerbaar. (https://vmake.ai/developers)

### Authenticatie
- Een sleutelpaar "Access Key" + "Secret Key", aan te maken op `https://vmake.ai/developers#api-key` ("Only one API key can be created."). Verzoeken worden ondertekend met "SDK-HMAC-SHA256" (headers `X-Sdk-Date`, `X-Sdk-Content-Sha256`, `Authorization`), volgens de Doc-tab en de officiële SDK. Dus geen simpele API-key-header. (https://vmake.ai/developers)

### Endpoints voor productfoto → productvideo
- **Niet gevonden.** De documentatie omschrijft zichzelf als "Image/Video watermark removal and quality enhancement API." De enige gepubliceerde taken zijn `eraser_watermark`, `image_restoration`, `videoscreenclear` en `hdvideoallinone`. (https://vmake.ai/developers)
- Gedocumenteerde endpoints (basis `https://wapi-skill.vmake.ai`): `POST /skill/config.json` en `POST /skill/consume.json` (parameters `url`, `task`, `gid`), antwoord-envelop `{"meta":{"code":0,"msg":"ok"},"response":{}}`. Het indienen en pollen van een taak loopt via URL's die de server dynamisch teruggeeft. (https://vmake.ai/developers, Doc-tab)
- De website heeft wél "Product showcase" (`https://vmake.ai/product-video/create`: foto uploaden, beschrijving tot 3.000 tekens, voice-over, muziek) en "UGC video" (`https://vmake.ai/ugc-video`). Niets daarvan staat in de API-documentatie.

### Input en output
- API: formaten, maximale grootte, outputformaat, aspect ratio's, duur: **niet gevonden**. De SDK-README zegt alleen dat het resultaat "task_id, output_urls" bevat.
- Website (geen API-garantie): upload accepteert `.jpg,.png,.jpeg`; voorbeeldvideo's zijn 720×1280 (9:16), 10–15 s. Export per plan: Free tot 720p of 1080p met watermerk, Plus 1080p, Pro 1080p en 2K. (https://vmake.ai/pricing)

### Asynchroon
- Alleen polling. "Image tasks run synchronously ... Video tasks run asynchronously via spawn workflow." Webhooks: **niet gevonden**. Verwerkingstijd: **niet gevonden**. (https://vmake.ai/developers)

### Beperkingen
- Rate limits: **niet gevonden**. Wel een zelf in te stellen dagelijkse creditlimiet die om 00:00 Beijing-tijd reset. (https://vmake.ai/developers)
- Watermerk: Free-output heeft een watermerk; Plus/Pro niet. "Commercial Use" alleen op Plus en Pro. API-specifieke uitspraak: **niet gevonden**. (https://vmake.ai/pricing)
- Voorwaarden: geen API-clausule; Vmake mag gegenereerde content "at any time and for any reason" verwijderen. Bewaartermijn: **niet gevonden**. (https://vmake.ai/terms-of-service)

### Dichtstbijzijnde officiële route
- Zakelijk contact: `hello@vmake.ai`, support `support@vmake.ai` (https://vmake.ai/contact-us). Vmake heeft ook een CLI (`vmake-labs-cli`, https://vmake.ai/openclaw) die beweert video's te kunnen maken, maar dat is een interactieve agent-CLI met accountlogin, geen gedocumenteerde REST-API. Niet bruikbaar voor fase 7.

---

## 2. HeyGen

**Oordeel: werkt via API.**

### Bestaat er een API en hoe krijg je toegang?
- Publiek en self-serve, pay-as-you-go: "No plan, no subscription needed"; API-credits zijn los te kopen, ook door gratis gebruikers. "HeyGen does not offer free API credits starting Feb 2026"; credits verlopen na 12 maanden. (https://help.heygen.com/en/articles/10060327-heygen-api-pricing-explained, pagina gedateerd 16 september 2026)
- De self-serve prijstabel staat op `https://platform.heygen.com/pricing` achter een login. Ik heb die pagina in Chrome geopend: je bent daar niet ingelogd en ik heb niet ingelogd, dus **niet verifieerbaar**.
- Officiële indicaties: "1 minute of AvatarIV video via API should cost $4 for 1080p and $5 per minute when using 4K video." (https://help.heygen.com/en/articles/11269603-heygen-avatar-iv-complete-guide). Enterprise-tarieven (1 credit = $0,50): Avatar IV 0,1 credit per seconde (= $3/min), vertaling 0,05–0,1 credit per bronseconde per doeltaal. (https://developers.heygen.com/docs/enterprise-pricing)

### Authenticatie
- Header `X-Api-Key: <key>` op elk verzoek naar `https://api.heygen.com` (alternatief: OAuth2 bearer). Sleutels maak je op `https://platform.heygen.com/api-keys`; verbruik op `https://platform.heygen.com/usage`. (https://developers.heygen.com/docs/api-key.md, https://developers.heygen.com/docs/quick-start)

### Belangrijk: v3, en het einde van v1/v2
- De documentatie is verhuisd van docs.heygen.com naar developers.heygen.com; oude reference-URL's geven 404.
- v1/v2 zijn deprecated: "Now — October 31, 2026" ... "November 1, 2026 — end of support date." Antwoorden dragen `Deprecation: true` en `Sunset: Sat, 31 Oct 2026 00:00:00 GMT`. Mapping: `POST /v2/video/generate` → `POST /v3/videos`; `GET /v1/video_status.get` → `GET /v3/videos/{video_id}`. (https://developers.heygen.com/endpoint-version-comparison.md, door mij zelf geverifieerd)
- **We bouwen uitsluitend op v3.** Veel voorbeelden op internet gebruiken nog v2; die zijn over twee weken onbruikbaar.

### Endpoints voor script → presentator (alle v3)
- Avatars: `GET /v3/avatars` (groepen) en `GET /v3/avatars/looks`. "When creating a video, you pass a look ID, not a group ID, as the avatar_id." (https://developers.heygen.com/docs/avatars.md, https://developers.heygen.com/generate-avatar-video.md)
- Stemmen: `GET /v3/voices` met filters `language`, `gender`, `engine`. (https://developers.heygen.com/reference/list-voices.md)
- Video maken: `POST /v3/videos` met `type: "avatar"`, velden `avatar_id` (verplicht), `script` (max 5.000 tekens), `voice_id`, `aspect_ratio` met waarden `16:9 | 9:16 | 4:5 | 5:4 | 1:1 | auto`, `resolution` `4k | 1080p | 720p`, `background` `{type: "color" | "image", value | url | asset_id}`, `caption` `{file_format: "srt", style: "default"}` (style brandt captions in), `callback_url`, `callback_id`, `output_format` `mp4 | webm`. Antwoord: `data.video_id`, `data.status`. (https://developers.heygen.com/reference/create-video.md, door mij zelf geverifieerd)
- **Productfoto in beeld:** ja, als achtergrond via `background: {type: "image", url: ...}` (of in `type: "studio"` met `remove_background: true`, zodat de presentator vóór de foto staat). Een foto als losse overlay bovenop de presentator: **niet gevonden**. (https://developers.heygen.com/studio-videos.md)
- Vertaling van een afgeronde video: `POST /v3/video-translations` met `video` (`url` of `asset_id`) en `output_languages`; status via `GET /v3/video-translations/{id}`. (https://developers.heygen.com/reference/create-video-translation.md)

### Input en output
- Script max 5.000 tekens; audio-input max 10 min; output 25 fps; standaard 1080p; afbeeldingen JPG/PNG max 50 MB; video max 100 MB. (https://developers.heygen.com/docs/usage-limits)
- Resultaat: `GET /v3/videos/{video_id}` geeft `video_url` (presigned download-URL), `thumbnail_url`, `captioned_video_url`, `subtitle_url`, `duration`. URL's verlopen; de exacte termijn staat in de `Expires`-parameter van de URL, een vast getal is **niet gevonden**. Advies van HeyGen: snel downloaden. (https://developers.heygen.com/reference/get-video.md, https://developers.heygen.com/video-details.md)

### Asynchroon
- Polling: status `pending → processing → completed | failed`, voorbeeld pollt elke 10 s; limiet 500 statusverzoeken per minuut. (https://developers.heygen.com/reference/get-video.md, https://developers.heygen.com/docs/usage-limits)
- Webhooks: `POST /v3/webhooks/endpoints` (HTTPS-URL, events, geheim wordt één keer getoond), HMAC-SHA256-handtekening in header `signature`, binnen 10 s een 2xx terugsturen, retries tot 24 uur, duplicaten mogelijk. Events o.a. `avatar_video.success` en `avatar_video.fail` met `video_id`, `url`, `callback_id`. Ook per video een `callback_url`. (https://developers.heygen.com/docs/webhooks.md, https://developers.heygen.com/docs/webhook-events.md)
- Verwerkingstijd: "every 1 minute of video usually takes about 10 minutes to generate". (https://help.heygen.com/en/articles/9655503-heygen-video-processing-times)

### Beperkingen
- Pay-as-you-go: 10 gelijktijdige video's; `POST /v3/videos` 10 per seconde; read 300 per minuut; 429 met `Retry-After`. (https://developers.heygen.com/docs/usage-limits)
- Watermerk: "By default, all HeyGen videos come with a HeyGen logo watermark"; betaalde gebruikers kunnen het verwijderen. Of API-video's op een gratis account met gekochte credits een watermerk dragen: **niet gevonden**. (https://help.heygen.com/en/articles/11057301-how-to-remove-the-heygen-watermark)
- Commercieel gebruik: op betaalde plannen bezit je de output; output van het gratis plan "may not be sold, sublicensed, redistributed, monetized". Of pay-as-you-go API-output als betaald geldt: **niet gevonden**, navragen bij HeyGen vóór fase 7. (https://www.heygen.com/terms)

---

## 3. VEED

**Oordeel: niet via API voor samenvoegen, muziek, CTA en 9:16-render. Deels voor captions.**

### Bestaat er een API en hoe krijg je toegang?
- Ja, maar het is een API voor AI-modellen, niet voor de editor. `https://api.veed.io` biedt Fabric 1.0 (foto + audio → sprekende video), Lipsync 2.0, Clean Audio, Video Background Removal; Dubbing in early access; Live avatar op een wachtlijst; Subtitles "Coming soon" op api.veed.io. (https://api.veed.io/, https://api.veed.io/docs)
- Toegang: self-serve, aparte API-workspace met vooraf gekochte credits. "Editor subscriptions and AI credits don't pay for API jobs." Credits verlopen na twee jaar. Enterprise via sales. (https://api.veed.io/docs/accounts, https://support.veed.io/en/articles/17229001-veed-api-frequently-asked-questions)
- Prijzen: Fabric 1.0 $0,08/s (480p) en $0,15/s (720p); Lipsync 2.0 $0,07/s; Background Removal $0,008–$0,0225 per 30 frames; Clean Audio $0,0125/min. Gratis tegoed: **niet gevonden**. (https://api.veed.io/pricing)
- **Waarschuwing:** het marketingartikel https://www.veed.io/learn/best-video-api claimt text overlays, watermerken, trimmen, webhooks, een gratis tier en een Python-SDK. Niets daarvan staat in de echte documentatie en de FAQ zegt expliciet dat webhooks niet worden ondersteund. Dat artikel is onbetrouwbaar; ik heb het niet als bron gebruikt.

### Authenticatie
- `Authorization: Bearer <VEED_API_KEY>`; sleutels maak en herroep je in het workspace-dashboard. (https://api.veed.io/docs/concepts, https://api.veed.io/docs/quickstart)

### Wat kan er via API, per onderdeel van onze stap?
| Onderdeel | Via API? | Bron |
|---|---|---|
| Clips uploaden | Nee. Alleen publieke http(s)-URL's als input. | https://api.veed.io/docs/concepts |
| Clips achter elkaar zetten (timeline) | **Nee.** "we currently don't offer an API for the full editor." | https://support.veed.io/en/articles/15230204-veed-subtitles-api |
| Automatische captions | **Deels.** VEED Subtitles API op fal.ai: één clip in, MP4 met ingebrande ondertitels uit; $0,10/min basic, $0,20/min dynamic; 9:16, 1:1, 16:9; geen VEED-account nodig. Rechtstreeks op api.veed.io: "Coming soon". | https://support.veed.io/en/articles/15230204-veed-subtitles-api, https://www.veed.io/newsroom/veed-launches-subtitle-api |
| Muziek | Nee / niet gevonden | https://api.veed.io/docs/api |
| Tekst, CTA, eindkaart | Nee / niet gevonden | https://api.veed.io/docs/api |
| 9:16 MP4 renderen van een compositie | Nee. Alleen model-output (één MP4 per model-aanroep). | https://support.veed.io/en/articles/17229251-lipsync-apis-fabric-1-0-and-lipsync-2-0 |
| Templates | Nee / niet gevonden | https://api.veed.io/docs/api |

- Bijzonderheid: "OpenEdit" is een gratis open-source, lokaal draaiende agent-pipeline van VEED ("runs on your own machine", "no GUI and no timeline") die video samenstelt in HTML/CSS, captions inbrandt en MP4 exporteert. Het is geen gehoste API; rendering gebeurt op je eigen machine. (https://support.veed.io/en/articles/16342833-how-to-use-openedit-veed-s-agent-driven-video-editor)

### Input, output, asynchroon, beperkingen
- Voorbeeld: `POST https://api.veed.io/v1/fabric-1.0` → 202 met `job_id`; `GET /v1/fabric-1.0/{job_id}`; resultaat `result.video.url`. Output-URL's verlopen standaard na 1 dag (max 30 dagen via header). (https://api.veed.io/docs/api/post-v1-fabric-1-0, https://api.veed.io/docs/media-retention)
- Alleen polling (statussen PROCESSING, COMPLETED, FAILED, CANCELLED); "Webhooks are not supported." (https://api.veed.io/docs/concepts, FAQ)
- Rate limits bestaan (429 met `Retry-After`) maar de aantallen zijn **niet gevonden**. Commercieel gebruik van API-output is toegestaan onder de Terms of Sale. Watermerk op API-output: **niet gevonden** (editor: gratis exports hebben een watermerk). (https://api.veed.io/docs/accounts, https://support.veed.io/en/articles/7056370-will-the-videos-i-created-have-a-veed-watermark-on-them)

---

## 4. Alternatieven voor de stappen die niet via API kunnen

### Stap 1: productfoto → productclip (vervangt Vmake)

**A. Image-to-video-model via fal.ai (aanbevolen om mee te starten)**
- Wat: modellen als Kling, Veo en Seedance zetten één foto plus een tekstprompt om in een clip van 5–10 s. Voorbeeld-endpoint (de 2.1-variant is inmiddels deprecated, dus in fase 7 de actuele versie kiezen): input `image_url`, `prompt`, `duration` "5" of "10", `aspect_ratio` met o.a. `9:16`; output `video.url` als MP4; queue met `submit / status / result`. Prijs rond $0,25–0,28 per clip van 5 s. (https://fal.ai/models/fal-ai/kling-video/v2.1/standard/image-to-video)
- Voordelen: volledig programmeerbaar, 9:16 ondersteund, MP4-URL terug, snel, goedkoop, veel modellen achter één sleutel.
- Nadelen: het resultaat is "AI-beweging" op jouw foto, geen echte productvideo met meerdere shots; productdetails kunnen vervormen; prompt-kwaliteit bepaalt veel; webhooks op fal.ai heb ik niet geverifieerd (polling wel).

**B. Shotstack Generate API (zelfde leverancier als stap 3)**
- Shotstack's prijspagina rekent AI-generatie in credits af, bijvoorbeeld "a 5-second Seedance 2.5 720p clip for 14.8 credits ($2.96)". De Generate-endpoints staan in de navigatie van de API-referentie, maar de details kon ik niet lezen: **niet geverifieerd**. (https://shotstack.io/pricing/, https://shotstack.io/docs/api/)
- Voordelen: één leverancier voor genereren én samenvoegen, minder integraties.
- Nadelen: duurder per clip dan fal.ai; details nog te verifiëren.

**C. Vmake zakelijk benaderen**
- Vragen via `hello@vmake.ai` of de product-video-functie via API beschikbaar is of komt.
- Voordelen: dichtst bij het oorspronkelijke idee.
- Nadelen: geen gegarandeerde uitkomst of tijdlijn; ondertussen staat de bouw stil.

### Stap 3: samenvoegen, captions, muziek, CTA, 9:16-render (vervangt VEED)

**A. Shotstack Edit API (aanbevolen)**
- Wat: een JSON-"edit" met een timeline van clips, tekst, audio en effecten; `POST /render` en `GET /render/{id}`, header `x-api-key`, veld `callback` voor een webhook, templates met merge-velden, output `format: "mp4"`. Schema's `CaptionAsset` en `RichCaptionAsset` bestaan; of die captions automatisch uit spraak genereren is **niet geverifieerd**. Aspect ratio `9:16` heb ik niet letterlijk op de pagina gezien (wel `16:9` en vrije `size`). (https://shotstack.io/docs/guide/, https://shotstack.io/docs/api/)
- Prijzen: 10 gratis credits bij aanmelding (30 dagen geldig), pay-as-you-go $10 voor 50 minuten, Starter $39/maand voor 250 minuten. Watermerk en commercieel gebruik: **niet gevonden** op de prijspagina. (https://shotstack.io/pricing/)
- Voordelen: timeline-samenvoegen expliciet gedocumenteerd, webhook, templates, lage kosten, gratis sandbox.
- Nadelen: automatische captions en 9:16 moeten in fase 7 praktisch bevestigd worden; muziek moeten we zelf aanleveren (licentie).

**B. Creatomate**
- Wat: `POST https://api.creatomate.com/v2/renders` met `Authorization: Bearer`, body met `output_format: "mp4"`, `width: 720`, `height: 1280` (dus 9:16) en `elements`; automatische ondertitels zijn expliciet gedocumenteerd via een text-element met `transcript_source` dat naar het video-element wijst. Meerdere clips achter elkaar: op de gelezen pagina's **niet geverifieerd** (templates en "describe a whole video in code" wel). (https://creatomate.com/docs/api/quick-start/add-auto-generated-subtitles, https://creatomate.com/docs/api/introduction)
- Prijzen: proefperiode met 50 credits zonder creditcard; ongeveer 14 credits per minuut 720p-video; renders worden na 30 dagen verwijderd; API op alle plannen. Plan-bedragen laadden niet: **niet gevonden**. (https://creatomate.com/pricing)
- Voordelen: auto-captions en 9:16 zwart op wit gedocumenteerd; template-editor om de ad-opmaak te ontwerpen.
- Nadelen: samenvoegen van clips nog te bevestigen; renders verlopen na 30 dagen (eigen opslag nodig, dat geldt overigens voor alle opties).

**C. Zelf renderen met FFmpeg (plus VEED Subtitles API voor captions)**
- Wat: een eigen achtergrondjob plakt de clips aan elkaar, legt muziek en een eindkaart erover en rendert 9:16; captions via de VEED Subtitles API op fal.ai ($0,10/min).
- Voordelen: goedkoopst per video, volledige controle.
- Nadelen: wij bouwen en onderhouden de render-infrastructuur (workers, timeouts, opslag), muziekbibliotheek en licenties zelf; het meeste werk van de drie en het verst van "alleen orkestreren".

---

## 5. Voorstel voor de definitieve workflow

```
          ┌→ Stap 1  Productclip   (fal.ai image-to-video, 9:16, 5–10 s)  ──┐
Input ────┤                                                                ├→ Stap 3  Eindvideo (Shotstack Edit: clips + captions + muziek + CTA → 9:16 MP4) → opslag → preview + download
          └→ Stap 2  AI-presentator (HeyGen v3 POST /v3/videos, 9:16, webhook) ──┘
```

- **Stap 1** krijgt fal.ai; Shotstack Generate is het alternatief als we naar één leverancier voor stap 1 en 3 willen (eerst verifiëren).
- **Stap 2** blijft HeyGen, uitsluitend v3. We gebruiken de webhook (`callback_url`) met polling als vangnet. Optioneel de productfoto als achtergrond.
- **Stap 3** krijgt Shotstack, met Creatomate als reserve. De keuze valt definitief in fase 7 na een praktijktest met de gratis credits van beide: samenvoegen, auto-captions en 9:16 moeten alle drie aantoonbaar werken.
- **Opslag:** alle leveranciers geven tijdelijke URL's. De orchestrator (fase 8) kopieert elke tussen- en eindoutput naar onze eigen opslag voordat de volgende stap start en voordat de gebruiker downloadt.
- **Globale kostenindicatie per advertentie van 30 s** (ruwe schatting op basis van de genoemde bronnen): HeyGen ~$2 (30 s van ~$4/min), fal.ai ~$0,50 (clip van 10 s), Shotstack ~$0,20 (1 minuut rendertijd). Samen rond $3. Te bevestigen in fase 7.

### Wat ik vóór fase 7 van jou nodig heb (één beslissing)
Akkoord dat Vmake en VEED uit de keten gaan en vervangen worden door fal.ai en Shotstack (met Creatomate als reserve). Dit wijkt af van de oorspronkelijke brief, dus dat is jouw keuze, niet de mijne.

### Open punten die alleen met een account of via support te beantwoorden zijn
1. HeyGen: de self-serve API-prijstabel (achter login) en of pay-as-you-go output zonder watermerk en commercieel bruikbaar is op een gratis account.
2. Shotstack: automatische captions uit spraak en `9:16` in de praktijk; watermerk op de sandbox.
3. Creatomate: meerdere clips achter elkaar in één render.
4. fal.ai: welk image-to-video-model op dit moment de beste productweergave geeft, en of webhooks beschikbaar zijn.

---

## 6. Wat dit betekent voor de bestaande schermen

De app verandert weinig; het is vooral benaming en één technisch detail.

| Scherm / onderdeel | Nu | Na fase 7 |
|---|---|---|
| Stapkaarten (dashboard, projectpagina) | "Product video · VMAKE", "AI presenter · HEYGEN", "Final video · VEED" | Dienstlabels worden "AI video model (fal.ai)", "HeyGen", "Shotstack". Titels en uitleg blijven; `stepMeta` en `HowItWorks` zijn de enige plekken. |
| Sidebar-voetregel en Settings "Connected services" | "Vmake · HeyGen · VEED" | Nieuwe namen. |
| New video-formulier | foto's verplicht, script optioneel | Blijft. De eerste foto wordt de bron voor stap 1 en optioneel de achtergrond in stap 2. Geen nieuwe velden nodig; een avatar- of stemkeuze alleen als blijkt dat één standaard presentator niet volstaat. |
| Pipeline-tijden | "The real service usually needs a few minutes." | Klopt: HeyGen ~10 min per minuut video; stap 1 en 3 enkele minuten. De runner wordt vervangen door echte statussen uit webhooks (HeyGen, Shotstack) en polling (fal.ai). |
| Retry | zet een stap terug op Processing | Blijft; de orchestrator herstart alleen die stap met de bewaarde tussenresultaten. |
| Download | directe link naar placeholder | Wordt een link naar ons eigen opslagbestand, omdat leveranciers-URL's verlopen. |
| Demo mode | zichtbaar overal | Blijft aan tot de echte keten in fase 9 end-to-end werkt. |
| CLAUDE.md en docs | Vmake → HeyGen → VEED | Bij akkoord werk ik de workflow-sectie en het datamodel bij (`StepKey` wordt bijvoorbeeld `productClip | presenter | finalEdit` zodat de leverancier later nog wisselbaar is). |

Niets hiervan is al aangepast; dit document is de enige wijziging in deze fase.
