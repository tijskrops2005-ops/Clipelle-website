# Shotstack: wat we gebruiken voor de montage

Peildatum: 19 oktober 2026. Bronnen: https://shotstack.io/docs/api/ (API-referentie), https://shotstack.io/docs/guide/ (gidsen, index op https://shotstack.io/docs/guide/llms.txt). Haal vóór codewijzigingen altijd de actuele pagina op.

## Wat de dienst voor ons doet
Stap 5: presentatorclip + productclip + hook-tekst + ondertitels + muziek + CTA-eindkaart → één 9:16 MP4. Shotstack rendert een JSON-"edit" (timeline met tracks en clips) in de cloud.

## Platform
- **Auth en omgevingen:** header `x-api-key`. Sandbox `https://api.shotstack.io/edit/stage` (gratis, watermerk, max 10 min per render, zelfde limieten als productie), productie `https://api.shotstack.io/edit/v1` (credits). Sleutels per omgeving in het dashboard. Nieuwe accounts: 10 gratis credits (30 dagen), geen creditcard. Bron: https://shotstack.io/docs/guide/getting-started/request-api-keys.md, https://shotstack.io/docs/guide/architecting-an-application/limitations.md
- **Render:** `POST /edit/{env}/render` met `{timeline, output, callback?}` → `response.id`. `GET /edit/{env}/render/{id}` → `status` `queued | fetching | preprocessing | rendering | generating | saving | done | failed`, `url` (tijdelijk, 24 u; het CDN-bestand blijft), `duration`, `renderTime`, `error`. Bron: https://shotstack.io/docs/api/
- **Webhook:** veld `callback` (URL); POST met `type`, `action`, `id`, `owner`, `status`, `url`, `error`, `completed`. **Geen handtekening**: verifieer door de render via de API op te halen. Retries met exponentiële backoff (10×, ~49 min). Bron: https://shotstack.io/docs/guide/architecting-an-application/webhooks.md
- **Ingest API (eigen bestanden hosten):** `POST /ingest/{env}/upload` → `data.id` + `data.attributes.url` (signed PUT-URL); `PUT` het bestand; `GET /ingest/{env}/sources/{id}` → `status` `queued | importing | ready | failed`, `data.attributes.source` (gehoste URL), plus `duration`, `width`, `height`. Of `POST /ingest/{env}/sources` met `url` om een bestand van een URL te halen. Rate limit ingest 120/min. Bron: https://shotstack.io/docs/guide/ingesting-footage/sources.md
- **Limieten:** bronbestand tot 5 GB; edit-API 150 verzoeken/min; output max 1920 px per zijde.

## De edit-JSON die wij bouwen (`src/lib/services/finalEdit.ts`)
- **Output:** `format: "mp4"`, `resolution: "1080"`, `aspectRatio: "9:16"` (gedocumenteerde waarden: `16:9 | 9:16 | 1:1 | 4:5 | 4:3`), `fps: 25`.
- **Tracks (bovenste eerst):** captions → tekst-overlays → video → muziek.
- **Video-clips:** `{type: "video", src, volume, trim}` met `fit: "crop"` (vult het kader, behoudt verhouding), `effect` (`zoomInSlow` enz.), `transition.in/out` (`fade`, `fadeFast`, `slideUp`, `zoom` …). Bron: https://shotstack.io/docs/guide/architecting-an-application/positioning.md
- **Captions:** `{type: "rich-caption", src: "alias://presenter"}`: Shotstack haalt de audio uit de clip met `alias: "presenter"`, transcribeert automatisch (99 talen) en zet woord-voor-woord captions. `src` mag ook een **publieke SRT- of VTT-URL** zijn ("The src property accepts a URL to a publicly accessible SRT or VTT file"); zo gebruiken we in Workflow B HeyGens `srt_caption_url`, zodat de captions exact de goedgekeurde tekst zijn. Live getest in de sandbox op 19 okt 2026 met een SRT uit HeyGens asset-opslag. Stijl: `font` (family, size, color, weight), `style.textTransform`, `stroke`, `border`, `padding`, `animation.style` `karaoke | highlight | pop | fade | slide | bounce | typewriter`, `active.font.color/background` voor het actieve woord. Bron: https://shotstack.io/docs/guide/architecting-an-application/rich-captions.md, https://shotstack.io/docs/guide/architecting-an-application/aliases.md
- **Tekst (hook, voordelen, eindkaart):** `{type: "rich-text", text, font, style, align, background {color, opacity, borderRadius, wrap}, padding, stroke, shadow, animation {preset: fadeIn | typewriter | slideIn | ascend | shift, duration, style, direction}}`; clip `width`/`height` begrenzen het tekstvak; `position` en `offset` (−1…1) plaatsen het. Eigen fonts via `timeline.fonts[].src`. Bron: https://shotstack.io/docs/guide/architecting-an-application/rich-text.md
- **Muziek:** `{type: "audio", src, volume 0–1, effect: fadeInFadeOut}` als eigen track (`timeline.soundtrack` is deprecated).
- **Opbouw:** hook 2 s (productclip, gedempt, sticker-tekst) → presentator (volledige lengte, captions) → productclip 4 s met drie voordelen als pillen → eindkaart 3 s (achtergrondkleur, kop, CTA-pil). Totale lengte volgt uit de presentatorclip.

## Workflow B: captions + 9:16 op een vertaalde video (`buildCaptionEdit`)
Twee tracks: `rich-caption` (zelfde stijl als de advertentie; `src` = SRT-URL van HeyGen, anders `alias://source` voor auto-transcriptie) boven één videoclip (`alias: "source"`, volledige lengte, `fit: "crop"` centreert de spreker in 9:16, of `fit: "contain"` voor letterbox op ink). Output 1080 × 9:16, 25 fps. Sandbox gratis; productie ≈ $0,10 per 30 s via de cost guard.

## Kosten voor onze stap
Sandbox gratis (watermerk). Productie pay-as-you-go $10 voor 50 minuten ⇒ ≈ $0,10 per advertentie van 30 s; Starter $39/mnd voor 250 min ⇒ ≈ $0,08. Captions zijn in de gelezen docs niet apart geprijsd. Bron: https://shotstack.io/pricing/

## Grenzen die we bewust hanteren
- Alleen publieke URL's als bron; eigen bestanden eerst via Ingest.
- Resultaat altijd kopiëren naar eigen opslag (fase 8): de API-URL verloopt na 24 uur.
- Webhook-callback pas in fase 8, met verificatie via `GET /render/{id}`.
