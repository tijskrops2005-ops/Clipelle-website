# Montage-stap: Remotion vs Creatomate vs Shotstack

Datum: 19 oktober 2026. Vergelijking voor stap 5 van ons proces: presentatorclip + productclip + hook-tekst + TikTok-stijl ondertitels + muziek + CTA-eindkaart → één 9:16 MP4. Bronnen staan per onderdeel; prijzen zijn de gepubliceerde lijstprijzen op de peildatum.

## Samenvatting

| | Remotion (+ Lambda / Vercel Sandbox) | Creatomate | Shotstack |
|---|---|---|---|
| Wat het is | React-code wordt video; jij host de renderer (AWS Lambda, Vercel Sandbox of eigen server) | SaaS: templates uit een visuele editor, gevuld via JSON-API | SaaS: timeline-JSON naar MP4 via API, met AI-captions |
| Vormgevingsvrijheid | **Onbeperkt**: alles wat in HTML/CSS/React kan, frame-exact | Hoog binnen de template-editor; animaties via presets en keyframes | Gemiddeld: vaste asset-types, presets, posities; geen vrije animatie |
| TikTok-captions (woord-voor-woord) | Zelf bouwen met `@remotion/captions` (`createTikTokStyleCaptions`) + eigen transcriptie (Whisper) | `transcript_source` op een tekst-element, effect `highlight`; andere effecten niet gedocumenteerd | `rich-caption` met `alias://` naar de clip: automatische transcriptie (99 talen), animaties karaoke/highlight/pop/fade/slide/bounce/typewriter, actief-woord kleur en achtergrond |
| Hook-tekst en CTA-eindkaart | Vrij, met elke animatie | Tekst-elementen in de template, animeerbaar | `title`/`rich-text` assets met posities, overgangen (fade, slide, zoom) |
| Kosten per advertentie van 30 s | Rendering ≈ $0,01–0,05 (Lambda) + transcriptie; licentie gratis voor jou | ≈ 7 credits; Essential $54/mnd voor 2.000 credits ⇒ ≈ $0,19 per advertentie, of ≈ $0,09 op Growth ($129/mnd) | Pay-as-you-go $10 per 50 min ⇒ $0,10; Starter $39/mnd per 250 min ⇒ $0,08; sandbox gratis (watermerk) |
| Licentie | Gratis voor individuen en bedrijven tot 3 personen; daarboven Company License ($25/mnd per seat, of $0,01 per render met $100/mnd minimum voor automatisering) | Abonnement; API op alle plannen; "individual" mag Essential | Abonnement of pay-as-you-go; commercieel gebruik niet apart beschreven |
| Opzetcomplexiteit | **Hoog**: AWS-account, Lambda-deploy, S3, Chrome-binaries, eigen captions-pipeline, eigen hosting en monitoring | **Laag**: template in de editor, één POST, webhook | **Laag**: JSON bouwen, één POST, webhook; Ingest API voor uploads |
| Controle over output-URL | Volledig (eigen S3/Blob) | Renders na 30 dagen verwijderd; kopiëren naar eigen opslag | Tijdelijke URL verloopt na 24 u; CDN-bestand blijft; kopiëren naar eigen opslag |

## Per optie

### 1. Remotion

- **Wat:** video's als React-componenten; rendering met Chrome in de cloud. Twee hostingroutes die Remotion zelf documenteert: **Remotion Lambda** (AWS: Lambda-functie + S3; chunks parallel; "multiple minutes of video for just a few pennies") en **Vercel Sandbox** (ephemeral Linux-VM per render, Blob-opslag; timeout 45 min op Hobby, 5 u op Pro; 10 gelijktijdige renders op Hobby). Gewone Vercel-functies renderen niet zelf; ze kunnen een Lambda-render starten. Bronnen: https://www.remotion.dev/docs/lambda, https://www.remotion.dev/docs/vercel-sandbox, https://www.remotion.dev/docs/miscellaneous/vercel-functions
- **Captions:** `@remotion/captions` levert `createTikTokStyleCaptions()` (pagina's met woord-tokens en tijdstempels) maar geen transcriptie; die komt uit Whisper (`@remotion/install-whisper-cpp` of OpenAI). Dus een extra stap en extra infrastructuur. Bron: https://www.remotion.dev/docs/captions/create-tiktok-style-captions
- **Licentie:** "Remotion is free to use for individuals and companies up to three people." Daarboven $25/mnd per seat (Creators) of, voor automatisering, $0,01 per render met $100/mnd minimum. Voor jou als eenling nu gratis; de drempel ligt bij de vierde medewerker. Bronnen: https://www.remotion.pro/license, https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
- **Kosten:** AWS Lambda-seconden en S3; Remotion zelf rekent in de gratis tier niets. Realistisch enkele centen per advertentie. Vercel Sandbox: geen vaste prijzen gevonden, per minuut VM-tijd.
- **Voordelen:** ongekende vormgevingsvrijheid, pixel-perfecte merkstijl, één codebase (TypeScript/React) met de rest van de app, geen leveranciersafhankelijkheid, laagste variabele kosten.
- **Nadelen:** wij bouwen én beheren de render-infrastructuur (deploy, Chrome, geheugen, timeouts, retries), de captions-pipeline (Whisper) en de opslag. Dat is het meeste werk van de drie en botst met "alleen orkestreren". Elke wijziging in de video-opbouw is programmeerwerk, geen template-aanpassing.

### 2. Creatomate

- **Wat:** je ontwerpt een template in hun editor (lagen, animaties, keyframes) en vult die per render via `POST https://api.creatomate.com/v2/renders` met `Authorization: Bearer`. Ook zonder template: de hele compositie als JSON. Bronnen: https://creatomate.com/docs/api/introduction, https://creatomate.com/docs/api/quick-start/add-auto-generated-subtitles
- **Captions:** tekst-element met `transcript_source` dat naar het video-element wijst; Creatomate transcribeert automatisch. Gedocumenteerd effect: `highlight` (woord licht op terwijl het wordt uitgesproken), `transcript_maximum_length` voor het aantal tekens per blok. Andere caption-animaties: niet gedocumenteerd op de gelezen pagina's.
- **Samenvoegen van clips:** op de gelezen pagina's niet expliciet beschreven; de editor werkt met tijdlijnen en meerdere scènes, dus vrijwel zeker mogelijk, maar het is in fase 6 ook al als "te verifiëren" gemarkeerd.
- **Prijzen:** Essential $54/mnd (2.000 credits), Growth 10K $129/mnd; "One minute of video at 720p (25 fps) is about 14 credits" ⇒ een advertentie van 30 s ≈ 7 credits ≈ $0,19 (Essential) of ≈ $0,09 (Growth). Proefperiode 50 credits. Creatomate adviseert individuen Essential en bedrijven minimaal Growth. Renders worden na 30 dagen verwijderd. Bronnen: https://creatomate.com/docs/account/how-does-the-pricing-work, https://creatomate.com/pricing
- **Voordelen:** visuele template-editor (jij kunt de look zelf aanpassen zonder code), API op alle plannen, auto-ondertitels gedocumenteerd, 9:16 expliciet (720×1280).
- **Nadelen:** duurste vaste kosten van de drie, geen gratis sandbox (wel 50 proefcredits), credits vervallen maandelijks, caption-animaties beperkt tot wat gedocumenteerd is, concatenatie nog te verifiëren.

### 3. Shotstack

- **Wat:** een JSON-"edit" met tracks en clips (video, audio, image, title, rich-text, rich-caption), `POST /edit/{env}/render`, status via `GET /edit/{env}/render/{id}` (`queued → fetching → rendering → saving → done | failed`), `callback`-webhook (geen handtekening; verifieer via de API). Output `format: mp4`, `resolution: 1080`, `aspectRatio: "9:16"`, fps 25/30. Lokale bestanden via de Ingest API (`POST /ingest/{env}/upload` → signed PUT → `GET /ingest/{env}/sources/{id}` → gehoste URL). Bronnen: https://shotstack.io/docs/api/, https://shotstack.io/docs/guide/ingesting-footage/sources.md, https://shotstack.io/docs/guide/architecting-an-application/webhooks.md
- **Captions:** `rich-caption` met `src: "alias://presenter"`: "Shotstack automatically detects the language and generates word-level captions from the audio", 99 talen. Animaties `karaoke | highlight | pop | fade | slide | bounce | typewriter`, actief woord met eigen kleur, achtergrond en stroke, hoofdletters, eigen fonts, positie en rotatie. Dit is precies de TikTok-stijl. Bron: https://shotstack.io/docs/guide/architecting-an-application/rich-captions.md
- **Hook en CTA:** `title`-asset (stijlen `minimal`, `blockbuster`, `vogue`, …; posities; `offset`) of `rich-text` (eigen font, grootte, kleur, uitlijning); clip-overgangen `fade`, `slideUp`, `zoom` enz. Geen vrije keyframe-animatie.
- **Prijzen:** 10 gratis credits bij aanmelden (30 dagen), **sandbox gratis met watermerk**, pay-as-you-go $10 voor 50 minuten ($0,10 per advertentie van 30 s), Starter $39/mnd voor 250 minuten ($0,08), Pro $99/mnd. Rate limit 150 edit-verzoeken per minuut. Bronnen: https://shotstack.io/pricing/, https://shotstack.io/docs/guide/getting-started/request-api-keys.md, https://shotstack.io/docs/guide/architecting-an-application/limitations.md
- **Voordelen:** laagste instap (gratis sandbox, $10 om te beginnen), auto-captions met woord-animaties zonder eigen transcriptie, timeline-samenvoegen expliciet gedocumenteerd, templates met merge-velden, webhook.
- **Nadelen:** vormgeving beperkt tot de asset-types en presets (geen vrije animaties, geen eigen React-componenten), webhook zonder handtekening, tijdelijke URL na 24 u (CDN-bestand blijft), Ingest-stap nodig voor eigen bestanden.

## Aanbeveling

**Start met Shotstack voor de MVP; houd Remotion achter de hand voor als de vormgeving het plafond raakt.**

Redenen:
1. **Het dekt de hele advertentie-opbouw zonder extra infrastructuur:** clips achter elkaar, hook-tekst, TikTok-captions met woordanimatie uit automatische transcriptie, muziek, eindkaart met CTA, 9:16 op 1080p. Bij Remotion moeten we transcriptie, rendering en opslag zelf bouwen; bij Creatomate zijn de caption-animaties en het samenvoegen minder zeker.
2. **Laagste risico en kosten om te beginnen:** gratis sandbox om de montage nu al te testen met onze demo-video's, daarna $10 pay-as-you-go. Per advertentie ≈ $0,08–0,10, vergelijkbaar met Remotion-Lambda als je onze eigen bouw- en beheertijd meetelt, en goedkoper dan Creatomate.
3. **Past bij het product:** "orkestreren, niet bouwen". De montage is een JSON-sjabloon in onze code (`finalEdit.ts`) dat we kunnen versiebeheren en per klant kunnen variëren met merge-velden.

Wanneer overstappen naar Remotion: zodra je merkstijl, animaties of lay-outs wilt die Shotstacks presets niet kunnen (bijvoorbeeld een eigen hook-animatie per invalshoek of een volledig eigen caption-ontwerp). Omdat de montage-stap achter één interface zit (`finalEdit.ts` met clips, teksten, captions, muziek in → MP4-URL uit), is dat een vervanging van één module, niet van de app. Licentietechnisch is Remotion voor jou nu gratis; let op de drempel van drie personen.

Creatomate zou ik alleen kiezen als je zelf regelmatig de video-lay-out visueel wilt aanpassen zonder code; dan weegt de editor op tegen de hogere vaste kosten.

## Wat ik na jouw keuze bouw (stap 4)

- `src/lib/services/finalEdit.ts` met één functie: presentator-URL, productclip-URL, hook, voordelen, CTA, muziek-URL in → render-id, status, MP4-URL uit.
- Shotstack-variant: Edit-JSON met vier tracks (captions, tekst, video, muziek), Ingest-upload voor lokale bestanden, sandbox als standaard, polling en callback.
- Testpagina `/dev/final-edit` met de demo-video's uit `public/demo/` en een gegenereerde muziektrack, gratis in de sandbox.
