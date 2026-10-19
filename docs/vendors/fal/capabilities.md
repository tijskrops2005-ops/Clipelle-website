# fal.ai: wat we gebruiken voor de productclip

Peildatum: 19 oktober 2026. Bronnen: https://fal.ai/docs en de modelpagina's op https://fal.ai/models. Haal vóór codewijzigingen altijd de actuele modelpagina op: modellen, velden en prijzen wisselen vaak (het hier gebruikte Kling 2.1-endpoint uit fase 6 was twee weken later al "deprecated").

## Wat de dienst voor ons doet
Stap 3: productfoto → korte 9:16-clip. Daarnaast de AI-uitbreiding (outpainting) van de foto naar 9:16 zonder de originele pixels aan te raken.

## Platform
- **Queue API:** `POST https://queue.fal.run/{model_id}` met header `Authorization: Key <FAL_KEY>`; antwoord `request_id`, `status_url`, `response_url`. Status via `GET …/requests/{id}/status` (`IN_QUEUE | IN_PROGRESS | COMPLETED`), resultaat via `GET …/requests/{id}`. Bron: https://fal.ai/docs/model-apis/queue
- **Webhooks:** `?fal_webhook=<url>` op de submit-URL (SDK: `webhookUrl`). Payload `request_id`, `status` `OK | ERROR`, `payload`. Handtekening: headers `X-Fal-Webhook-Request-Id`, `-User-Id`, `-Timestamp`, `-Signature`; ED25519-sleutels op `https://rest.fal.ai/.well-known/jwks.json`; bericht = id, user-id, timestamp en SHA-256 van de body, gescheiden door newlines; timestamp max 300 s oud. Retries tot 31× met backoff; resultaten blijven ~1 uur bewaard. Bron: https://fal.ai/docs/model-apis/webhooks
- **JS-client:** `@fal-ai/client`: `createFalClient({credentials})`, `fal.storage.upload(blob)` → gehoste URL, `fal.queue.submit / status / result`, `fal.subscribe` (pollt zelf). Bron: https://github.com/fal-ai/fal-js, https://fal.ai/docs/model-apis/clients/javascript
- **Bestanden:** inputs zijn URL's; eigen bestanden uploaden via `fal.storage.upload` (fal CDN, `v3.fal.media`). Resultaat-URL's zijn tijdelijk: direct naar eigen opslag kopiëren.
- **Verbruik en kosten (gecontroleerd 19 okt 2026):** `GET https://api.fal.ai/v1/models/usage?start=…&end=…&expand=summary` (header `Authorization: Key …`; de sleutel heeft de permissie `billing:usage:read` nodig, preset BILLING of FULL) geeft per endpoint `unit`, `quantity`, `unit_price`, `cost_total` voor de periode. Geaggregeerd, geen request-id per regel; dus goed om onze totalen per model te controleren (`/dev/costs`), niet om één aanroep na te rekenen. Ook: `GET /v1/models/pricing?endpoint_id=…` voor actuele lijstprijzen en `…/pricing/estimate` voor een schatting vooraf. Bron: https://fal.ai/docs/platform-apis/v1/models/usage, https://fal.ai/docs/api-reference/platform-apis/for-models. Geen saldo-endpoint.

## Modellen die we gebruiken

### Productclip (image-to-video)
| Model | Endpoint | Input | Prijs (fal.ai, 19 okt 2026) | Keuze |
|---|---|---|---|---|
| MiniMax H3 Max | `minimax/h3-max/image-to-video` | `prompt`*, `image_url` (eerste frame; **het beeldformaat volgt de foto**), `end_image_url`, `duration` (s, standaard 5), `resolution` `480P | 768P | 1080P`, `prompt_expansion_mode` `disabled | balanced | quality`, `seed` | 768p $0,052/s (promotie tot 31 okt), daarna $0,08/s; 480p $0,05/s; 1080p $0,16/s | **Standaard**: goedkoopst, snel. |
| Kling v3 Standard | `fal-ai/kling-video/v3/standard/image-to-video` | zelfde velden als Pro; geen resolutieparameter, uitvoer gemeten op 720×1280 (19 okt 2026); de montage schaalt op naar 1080×1920 | $0,084/s zonder audio, $0,126/s met audio | Standaard vanaf 1 november (docs/cost-quality.md §2). |
| Kling v3 Pro | `fal-ai/kling-video/v3/pro/image-to-video` | `start_image_url`*, `prompt`, `duration` "3"–"15" (standaard "5"), `generate_audio` (standaard true), `negative_prompt`, `cfg_scale`; beeldformaat volgt de startfoto | $0,112/s zonder audio, $0,168/s met audio | **Kwaliteitsoptie**: productdetails blijven beter intact. |
| Seedance 2.5 | `bytedance/seedance-2.5/image-to-video` | `image_url`, `prompt`, `aspect_ratio` incl. `9:16`, `resolution` `480p | 720p | 1080p`, `duration` 4–30 s | 480p ~$0,22/s, 720p ~$0,47/s | Niet gekozen: 5–10× duurder. |
Bronnen: https://fal.ai/models/minimax/h3-max/image-to-video/api, https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api, https://fal.ai/models/bytedance/seedance-2.5/image-to-video

Omdat MiniMax en Kling het formaat van de invoerfoto overnemen, maakt onze service de foto **zelf eerst 9:16** (zie hieronder) en levert hij 1080×1920 aan.

### Uitbreiden naar 9:16 (outpainting)
- **Bria Expand** `fal-ai/bria/expand`: `image_url`*, `canvas_size`* `[w, h]` (oppervlak < 5000×5000), `original_image_size` `[w, h]`, `original_image_location` `[x, y]` (linkerbovenhoek van het origineel op het canvas), `prompt`, `negative_prompt`, `seed`; of `aspect_ratio` (dan worden size/location genegeerd). Output `image.url` (PNG). **$0,04 per beeld.** Getraind op gelicentieerde data, "safe for commercial use". Bron: https://fal.ai/models/fal-ai/bria/expand/api
- Wij plakken na afloop de originele pixels exact terug op `original_image_location`, zodat logo's en tekst op het product gegarandeerd ongewijzigd zijn, wat het model ook doet.
- Alternatief bekeken: FLUX.1 Fill pro (`fal-ai/flux-pro/v1/fill`, masker-gebaseerd, $0,05 per megapixel, "preserves everything outside the mask"). Niet gekozen: vraagt een eigen masker en canvas-voorbewerking; Bria doet precies uitbreiden.

## Kosten voor onze stap
Per product: $0 (slim bijsnijden) of $0,04 (uitbreiden) + clip van 5 s: $0,26 (MiniMax, promo) tot $0,56 (Kling). Na 31 oktober: MiniMax $0,40.

## Grenzen die we bewust hanteren
- Clips van 5 s; langere clips kosten lineair meer en de montage gebruikt toch korte stukken.
- Audio uit (Kling) en geen spraak: muziek komt pas in de montage.
- Prompt beschrijft alleen camera en beweging; de foto blijft het eerste frame.
