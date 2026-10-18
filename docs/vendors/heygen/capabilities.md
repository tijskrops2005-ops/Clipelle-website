# HeyGen API: wat het kan (referentie voor Reelay)

Peildatum: 18 oktober 2026. Bronnen: `https://developers.heygen.com` (index in `llms.txt` naast dit bestand, OpenAPI-spec op `/openapi/external-api.json`, 179 endpoints). Alles hieronder is in eigen woorden en bewust beknopt; **haal vóór het schrijven van code altijd de actuele bronpagina op**, want de documentatie verandert vaak (v1/v2 verdwijnen op 31 oktober 2026, velden worden hernoemd, prijzen verschuiven).

Conventies:
- Basis-URL `https://api.heygen.com`, header `X-Api-Key`. Alleen v3 gebruiken.
- Vrijwel alles is asynchroon: aanmaken geeft een id, daarna pollen (`GET …/{id}`) of een webhook (`callback_url` per aanroep, of een geregistreerd endpoint).
- Bestanden gaan mee als `{type: "url"}`, `{type: "asset_id"}` (na upload) of soms `base64`. Alle resultaat-URL's zijn tijdelijk (presigned): direct downloaden naar eigen opslag.
- Kosten: self-serve tarieven staan achter login op `https://platform.heygen.com/pricing` (niet verifieerbaar). Hieronder de **enterprise-tarieven** als indicatie; 1 credit = $0,50. Waar geen tarief staat: "niet vermeld".

Legenda voor de kolom "Voor ons": zie `docs/roadmap.md`, sectie "HeyGen-functies per fase".

---

## 1. Video maken met een presentator

### 1.1 Avatar-video (script → sprekende presentator)
- **Wat:** een gekozen avatar (look) spreekt een tekst uit met een gekozen stem. Dit is onze stap "AI-presentator".
- **Endpoint:** `POST /v3/videos` met `type: "avatar"`; status via `GET /v3/videos/{video_id}`.
- **Input:** `avatar_id` (look-id), `script` (max 5.000 tekens) + `voice_id`, of eigen audio (`audio_url` / `audio_asset_id`); `aspect_ratio` `16:9 | 9:16 | 4:5 | 5:4 | 1:1 | auto`; `resolution` `720p | 1080p | 4k`; `engine.type` `avatar_iii | avatar_iv | avatar_v`; `background` (`color` of `image`, met `remove_background`); `caption` (SRT, optioneel ingebrand); `voice_settings` (`speed` 0,5–1,5, `pitch`, `locale`); `motion_prompt`, `expressiveness`; `output_format` `mp4 | webm`; `brand_glossary_id`; `callback_url`/`callback_id`; `Idempotency-Key`-header.
- **Output:** `video_url`, `thumbnail_url`, `gif_url`, `captioned_video_url`, `subtitle_url`, `duration`; statussen `pending → processing → completed | failed`.
- **Kosten:** Avatar IV 0,1 credit/s (≈ $0,05/s, ≈ $3/min); Avatar III 0,0167 credit/s (≈ $0,008/s); Avatar V 0,1 credit/s (alleen digital twins). Help-center noemt voor self-serve ≈ $4/min (1080p).
- **Bron:** https://developers.heygen.com/reference/create-video.md, https://developers.heygen.com/generate-avatar-video.md, https://developers.heygen.com/docs/enterprise-pricing

### 1.2 Foto-avatar / "image" video (foto van een persoon → sprekend)
- **Wat:** een stilstaande foto van een persoon wordt een sprekende video. Geen motion prompt mogelijk; voor terugkerend gebruik raadt HeyGen een Photo Avatar aan (zie 3.2).
- **Endpoint:** `POST /v3/videos` met `type: "image"`, veld `image` (`url` of `asset_id`, PNG/JPEG) in plaats van `avatar_id`; verder dezelfde velden als 1.1.
- **Kosten:** niet apart vermeld (valt onder Avatar-engines; Photo Avatar op Avatar III is duurder: 0,0433 credit/s).
- **Bron:** https://developers.heygen.com/image-to-video.md

### 1.3 Cinematic avatar (prompt → filmische shot met avatar, zonder script)
- **Wat:** beschrijf een shot in tekst; HeyGen genereert 4–15 s film met één tot drie avatar-looks erin (Seedance-pipeline). Geen stem, geen script.
- **Endpoint:** `POST /v3/videos` met `type: "cinematic_avatar"`: `prompt` (max 10.000 tekens), `avatar_id` (array van 1–3 look-id's), `references`, `duration` 4–15 s of `auto_duration`, `aspect_ratio` `16:9 | 9:16 | 1:1`, `resolution` `720p | 1080p`, `enhance_prompt`.
- **Kosten:** 7 credits per video (≈ $3,50), ongeacht lengte.
- **Bron:** https://developers.heygen.com/cinematic-avatar.md

### 1.4 Studio-video (meerdere scènes aaneen)
- **Wat:** 1–50 scènes achter elkaar: `avatar_video` (presentator, met kleur/foto/video als achtergrond), `image` (foto, stil of ingesproken) en `video` (clip, optioneel met voice-over). Captions kunnen worden ingebrand. **Geen** tekst-overlays, CTA, eindkaart, muziek of overgangen.
- **Endpoint:** `POST /v3/videos` met `type: "studio"`, `scenes[]`, `aspect_ratio`, `resolution` `720p | 1080p`, `caption`, `brand_glossary_id`.
- **Kosten:** per scène volgens de engine (presentatorscènes als 1.1); niet apart vermeld voor foto/video-scènes.
- **Bron:** https://developers.heygen.com/studio-videos.md

### 1.5 Templates (lay-out uit HeyGen Studio, via API gevuld)
- **Wat:** je ontwerpt één keer een video-lay-out in HeyGen Studio met benoemde variabelen; via de API vul je die en render je. Variabelen: `text` (tot 10.000 tekens), `image` (`fit`), `video` (`fit`, `play_style`, `volume`), `audio`, `voice` (`voice_id`), `character` (`avatar_id`). Captions via `caption: true` of `subtitles.preset_name` (`classic`, `bold`, `bright`, …). Meerdere scènes; `scene_ids` om een deel te renderen. `dimension` en `fps` (25/30/60).
- **Endpoints:** `GET /v3/templates`, `GET /v3/templates/{id}`, `POST /v3/templates/{id}` (render), `PUT /v3/templates/{id}/variables`, `POST /v3/templates` (template uit bestaande video).
- **Kosten:** niet vermeld (vermoedelijk als de presentatorscènes; verifiëren met een test).
- **Bron:** https://developers.heygen.com/templates.md, https://developers.heygen.com/templates-guide.md
- **Opmerking:** dit is de enige HeyGen-route waarmee tekstlagen, een productclip, een presentator, muziek (`audio`-variabele) en captions in één render samenkomen. Daarmee is het een serieuze kandidaat voor onze montage-stap; dat vraagt wel een handmatig in Studio gebouwd sjabloon per advertentie-opbouw.

### 1.6 Bestaande video bewerken
- **Wat:** scènes van een afgeronde video opvragen en per scène in gewone taal wijzigen (tekst, visuals, achtergrond). Loopt via een Video Agent-sessie met `edit_plan`; er is ook `POST /v3/videos/{video_id}` met `edit_version`, `scenes`, `actions` (details op de reference-pagina).
- **Endpoints:** `GET /v3/videos/{video_id}/scenes`, `POST /v3/video-agents/{session_id}` (`edit_plan[]` met `scene_id`, `text`, `edit_version`), `POST /v3/videos/{video_id}`.
- **Kosten:** niet vermeld (of een bewerking als volledige re-render telt staat er niet).
- **Bron:** https://developers.heygen.com/docs/edit-scenes.md, https://developers.heygen.com/reference/create-video.md

### 1.7 Batches en bulk-status
- **Wat:** tot 100 video's in één verzoek (`type` `avatar | image | cinematic_avatar`; studio niet), één `batch_id`, webhook als alles klaar is. Bulk-status voor tot 100 id's in één call. Zelfde patroon voor vertalingen, lipsync en asset-uploads.
- **Endpoints:** `POST /v3/videos/batches`, `GET /v3/videos/batches/{batch_id}`, `GET /v3/videos/statuses?video_ids=…`; `POST /v3/video-translations/batches`; `POST /v3/lipsyncs/batches`; `POST /v3/assets/direct-uploads/batches`.
- **Kosten:** per item zoals los; geen batchkorting vermeld.
- **Bron:** https://developers.heygen.com/batch-videos.md, https://developers.heygen.com/reference/bulk-video-statuses.md

---

## 2. Avatars en looks

### 2.1 Openbare avatars opvragen
- **Wat:** avatar-groepen (karakters) en hun looks (outfit/omgeving). Bij video maken geef je een **look-id** als `avatar_id`. `supported_api_engines` zegt welke engines een look accepteert.
- **Endpoints:** `GET /v3/avatars` (`ownership`, `limit` 1–50, `token`), `GET /v3/avatars/looks` (`group_id`, `avatar_type`, `ownership`, `limit`, `token`; paging-velden `has_more`/`next_token` staan naast `data`), `GET /v3/avatars/looks/{look_id}`, `GET /v3/avatars/look-templates`.
- **Kosten:** gratis.
- **Bron:** https://developers.heygen.com/docs/avatars.md, https://developers.heygen.com/docs/avatar-looks.md

### 2.2 Eigen avatar maken
- **Wat:** drie routes: `digital_twin` uit video-opname (vereist toestemmingsflow van de gefilmde persoon), `photo` uit één foto (minuten), `prompt` uit een tekstbeschrijving (synthetisch persoon, geen consent nodig). Look packs voegen outfits/omgevingen toe aan een bestaand karakter.
- **Endpoints:** `POST /v3/avatars` (`type`, `name`, `file` of `prompt`, `reference_images`, `aspect_ratio`), `POST /v3/avatars/looks` (`type: look_pack | template`, `reference_look_id`, `template_id`), `POST /v3/avatars/{group_id}/consent`, `PATCH`/`DELETE` voor groepen en looks. Webhooks `instant_avatar.success|fail`.
- **Kosten:** Digital Twin 1 credit per aanroep (≈ $0,50), Photo Avatar 1 credit per aanroep; prompt-avatar niet vermeld.
- **Bron:** https://developers.heygen.com/docs/create-avatar.md, https://developers.heygen.com/docs/avatar-from-photo.md, https://developers.heygen.com/docs/avatar-from-prompt.md, https://developers.heygen.com/docs/avatar-consent.md

### 2.3 Transparante achtergrond
- **Wat:** `output_format: "webm"` levert een avatar met alfakanaal (geen `background` meesturen). Vereist een avatar met "matting". Los daarvan: `POST /v3/background-removals` haalt de achtergrond uit een bestaande video en geeft lagen `foreground`, `mask`, `background`.
- **Kosten:** webm niet apart vermeld; background removal $0,15 per minuut invoervideo.
- **Bron:** https://developers.heygen.com/transparent-background-videos.md, OpenAPI `POST /v3/background-removals`

### 2.4 Realtime avatar (streaming)
- **Wat:** lage-latentie streaming-avatar (HLS) voor live toepassingen; tekst kan tijdens de sessie worden toegevoegd.
- **Endpoints:** `POST /v3/avatar-realtime` (`type: tts | audio | text_stream`), `GET …/{stream_id}`, `…/text`, `…/words`, `…/cancel`.
- **Kosten:** niet vermeld. **Bron:** OpenAPI; https://developers.heygen.com/live-avatar.md

---

## 3. Stemmen en spraak

### 3.1 Stemmen opvragen
- **Wat:** 300+ catalogusstemmen, filterbaar op `language`, `gender`, `type`, `engine`; velden `voice_id`, `name`, `language`, `gender`, `preview_audio_url`, `available_engines`, `support_pause`, `support_locale`.
- **Endpoints:** `GET /v3/voices` (`limit` 1–100, `token`), `GET /v3/voices/{voice_id}`. Gratis.
- **Bron:** https://developers.heygen.com/reference/list-voices.md, https://developers.heygen.com/docs/voices/overview.md

### 3.2 Tekst-naar-spraak (zonder avatar)
- **Wat:** audio uit tekst met een catalogusstem; geeft audio-URL, duur en optioneel woord-timestamps. Engines `heygen_voice` (standaard), `starfish`, of ElevenLabs via `settings.model_id`. Ook streaming (`/v3/models/audio/tts/stream`).
- **Endpoints:** `POST /v3/voices/speech` (`text`, `voice_id`, `speed`, `language`, `locale`, `engine`, `settings`), `POST /v3/models/audio/tts`.
- **Kosten:** Starfish 0,000333 credit/s (≈ $0,01/min); andere engines niet vermeld.
- **Bron:** https://developers.heygen.com/docs/voices/speech.md, OpenAPI

### 3.3 Eigen stem: klonen of ontwerpen
- **Wat:** instant clone uit één opname (`POST /v3/voices/clone`: `audio`, `voice_name`, `language`, `remove_background_noise`); professionele clone uit 20+ minuten opname (via `/v3/models/audio/voices`); stem ontwerpen uit een tekstbeschrijving (`POST /v3/voices`: `prompt` max 1.000 tekens, `gender`, `locale`, `seed`; levert tot 3 opties).
- **Kosten:** niet vermeld.
- **Bron:** https://developers.heygen.com/docs/voices/heygen-voice-instant-clone.md, https://developers.heygen.com/docs/voices/professional-voice-clone.md, https://developers.heygen.com/design-a-voice.md

### 3.4 Brand glossary (uitspraak en vaste vertalingen)
- **Wat:** lijst met termen en hun uitspraak (`terms`), termen die niet vertaald mogen worden (`do_not_translate_terms`) en vaste vertalingen (`forced_translations`). Toepasbaar via `brand_glossary_id` op video's, templates, vertalingen, Video Agent en batches.
- **Endpoints:** `POST/GET/PATCH/DELETE /v3/brand-glossaries`. Kosten: niet vermeld (vermoedelijk gratis).
- **Bron:** https://developers.heygen.com/docs/brand-glossary.md

---

## 4. Vertalen en lipsync

### 4.1 Video-vertaling
- **Wat:** een afgeronde video in 175+ talen, met gekloonde stem van de spreker en lipsync; SRT en VTT worden meegeleverd. `mode` `speed` (sneller) of `precision` (hogere lipsync-kwaliteit). Meerdere doeltalen in één verzoek geven één id per taal. Proofread-sessies laten ondertitels corrigeren vóór de eindrender.
- **Endpoints:** `POST /v3/video-translations` (`video`, `output_languages[]`, `mode`, `speaker_num`, `translate_audio_only`, `brand_glossary_id`, `enable_dynamic_duration`, `disable_music_track`, `start_time`/`end_time`, `callback_url`), `GET /v3/video-translations/{id}` (`status` `pending | running | completed | failed`, `video_url`, `srt_caption_url`, `vtt_caption_url`), `GET /v3/video-translations/languages`, proofread-endpoints onder `/v3/video-translations/proofreads`.
- **Kosten:** per seconde bronvideo per doeltaal: speed 0,05 credit/s (≈ $1,50/min), precision 0,1 credit/s (≈ $3/min), proofread 0,00833 credit/s. Altijd op bronduur berekend.
- **Bron:** https://developers.heygen.com/docs/video-translate.md, https://developers.heygen.com/docs/video-translation-precision.md

### 4.2 Lipsync (nieuwe audio op bestaande video)
- **Wat:** vervangt de audio van een video en tekent de mond opnieuw; geen vertaling, geen spraakgeneratie. Handig om een andere voice-over op dezelfde beelden te zetten.
- **Endpoints:** `POST /v3/lipsyncs` (`video`, `audio`, `mode` `speed | precision`, `start_time`/`end_time`), `GET /v3/lipsyncs/{id}`.
- **Kosten:** speed 0,05 credit/s, precision 0,1 credit/s.
- **Bron:** https://developers.heygen.com/lipsync-speed.md, https://developers.heygen.com/lipsync-precision.md

---

## 5. Beeld- en videogeneratie zonder avatar

### 5.1 Videomodellen (prompt of foto → clip)
- **Wat:** generieke videogeneratie, los van avatars. Twee routes:
  - `POST /v3/models/videos` met model `heygen-video-1` (MiniMax H3): `mode` `text_to_video | image_to_video | reference_to_video`; bij `image_to_video` is de foto het eerste frame. `duration` 5–15 s, `aspect_ratio` o.a. `9:16`, `resolution` `480p | 768p | 1080p | 2k`; output MP4 24 fps met audio.
  - `POST /v3/video-generations` met `model` `seedance-2.5` (duur 4–30 s, `reference_images`, `reference_videos`, `generate_audio`) of `minimax-h3-max` (duur tot 15 s, `first_frame`, `end_frame`, `middle_frame`, referenties). Webhook `video_generation.success|fail`.
- **Kosten:** niet absoluut vermeld; alleen "1080p en 2k kosten 3× het 768p-tarief". Vereist een betaald API-saldo.
- **Bron:** https://developers.heygen.com/docs/models/heygen-video.md, OpenAPI `POST /v3/video-generations`
- **Opmerking:** dit overlapt met onze stap "productclip" (nu fal.ai). Eén leverancier minder is aantrekkelijk; prijs en kwaliteit moeten in een test blijken.

### 5.2 Beeldgeneratie
- **Wat:** afbeeldingen uit een prompt of bewerking van referentiebeelden met `gpt-image-2.5`, `nano-banana-2`, `nano-banana-2.1` (synchroon, max 300 s, `Idempotency-Key` verplicht). Daarnaast `heygen-image-1` met `identity_remix`: portretten van een persoon in de kleding/pose/omgeving van een referentiebeeld.
- **Endpoints:** `POST /v3/images`, `POST /v3/models/images` + `GET …/{generation_id}`.
- **Kosten:** "modelprijs", niet gespecificeerd. **Bron:** OpenAPI; https://developers.heygen.com/docs/models/heygen-image.md

### 5.3 Video Agent (prompt → complete video)
- **Wat:** één prompt (max 10.000 tekens) wordt script, avatarkeuze, scènes, graphics (HyperFrames: animaties, captions, overgangen) en render. `mode` `generate` of `chat` (interactief bijsturen, scènes bewerken). Opties: `avatar_id`, `voice_id`, `style_id` (curated stijlen), `brand_kit_id`, `brand_glossary_id`, `orientation` `landscape | portrait`, `files` (tot 20 bijlagen: PNG/JPEG, MP4/WebM, MP3/WAV, PDF). Rendertijd 5–10× de videolengte.
- **Endpoints:** `POST /v3/video-agents`, `GET /v3/video-agents/{session_id}`, `POST /v3/video-agents/{session_id}` (bericht of `edit_plan`), `GET /v3/video-agents/styles`, `GET /v3/video-agents/{session_id}/videos`.
- **Kosten:** 0,0667 credit/s output (≈ $2/min).
- **Bron:** https://developers.heygen.com/docs/video-agent.md, https://developers.heygen.com/docs/interactive-sessions.md, https://developers.heygen.com/docs/prompting-guide.md
- **Opmerking:** maakt in principe in één keer een hele advertentie, maar met weinig controle over de vaste opbouw (hook, voordelen, CTA). Interessant als experiment, niet als fundament.

### 5.4 Custom agents en podcasts
- Custom agents: vooraf geïnstalleerde agent-workflows die uit een onderwerp, screenshots en een presentatorclip een video maken (`POST /v3/custom-agents/{agent_id}/videos`). Podcasts: twee avatars in gesprek over een onderwerp of bronbestanden (`POST /v3/podcasts`, `layout` `landscape | portrait`, `duration` tot 5 min). Kosten niet vermeld. Bron: OpenAPI.

---

## 6. Montage, graphics en audio

### 6.1 HyperFrames (code-gedreven compositie)
- **Wat:** een video beschreven als HTML/CSS/JS (timing via `data-*`-attributen, variabelen via `data-composition-variables`), gerenderd in een headless browser. 150+ blokken (lower thirds, charts, social cards, overgangen). Lokaal, zelf gehost of in HeyGens cloud. Combineerbaar met een avatar-video plus muziek en effecten.
- **Endpoint (cloud):** `POST /v3/hyperframes/renders` (`project` als zip via `url`/`asset_id`/`base64`, `composition`, `variables`, `fps`, `quality` `draft | standard | high`, `format` `mp4 | webm | mov`, `resolution` `1080p | 4k`, `aspect_ratio` `16:9 | 9:16 | 1:1`), `GET …/{render_id}`.
- **Kosten:** 1080p/30 fps 0,1 credit/min (≈ $0,05/min); 60 fps 0,2; 4K 0,15–0,3 credit/min.
- **Bron:** https://developers.heygen.com/hyperframes-overview.md, https://developers.heygen.com/hyperframes-heygen.md, https://developers.heygen.com/automated-pipeline.md
- **Opmerking:** dit is een volwaardig alternatief voor Shotstack/Creatomate, maar dan "montage als webpagina": wij schrijven de HTML-compositie zelf. Veel controle, meer bouwwerk.

### 6.2 Muziek en geluidseffecten
- **Catalogus zoeken:** `GET /v3/audio/sounds` (`query` in gewone taal, `type` `music | sound_effects`, `limit` 1–50, `min_score`); geeft tracks met tijdelijke WAV-URL, `duration`, `score`. Kosten niet vermeld (lijkt gratis).
- **Muziek genereren:** `POST /v3/audio/music` met model `lyria-3-pro`: `prompt`, `duration_seconds`, `bpm`, `intensity`, `instrumental`, `lyrics`; synchroon, mp3-URL; `Idempotency-Key` verplicht. Kosten: vaste prijs per track (bedrag niet vermeld).
- **Audio-analyse:** `POST /v3/audio/analysis` (beats, maten, secties; voor montage op de maat). Kosten per audiolengte.
- **Bron:** https://developers.heygen.com/background-music.md, https://developers.heygen.com/sound-effects.md, OpenAPI
- **Opmerking:** de catalogus en generator leveren alleen een audiobestand. Mixen onder een video doet HeyGen niet, behalve via templates (`audio`-variabele), HyperFrames of Video Agent.

### 6.3 Transcriptie
- `POST /v3/audio/transcriptions` met `scribe-v2` (`word_timestamps`, `diarize`; max 10 min met diarize, 30 min zonder). Kosten per audiolengte. Bron: OpenAPI.

### 6.4 AI clipping en filler-word removal
- **AI clipping:** lange video → korte highlight-clips (`duration_types` `30 | 60 | 180 | long`, `aspect_ratio` `portrait | landscape | square`, captions met stijlpresets, `virality_score`). 0,15 credit per clip. Bron: https://developers.heygen.com/ai-clipping.md
- **Filler-word removal:** knipt "uhm" en stiltes uit een video; $0,30 per bronminuut, minimum 1 minuut, refund als er niets verandert. Bron: https://developers.heygen.com/filler-word-removal.md

### 6.5 Brand kit
- **Wat:** kleuren, lettertypen en logo's, geïmporteerd uit een website-URL; met rollen (`primary`, `accent`, `title_text`, …). Alleen toegepast door Video Agent (`brand_kit_id`), niet door avatar-video's of templates.
- **Endpoints:** `POST /v3/brand-kits` (`url`, `name`), `GET`, `PATCH`, `DELETE`. Kosten niet vermeld.
- **Bron:** https://developers.heygen.com/docs/brand-kits.md

---

## 7. Infrastructuur: assets, webhooks, workflows, account

### 7.1 Assets
- Upload tot 32 MB in één call (`POST /v3/assets`: png, jpeg, mp4, webm, mp3, wav, pdf, srt) of in delen via `POST /v3/assets/direct-uploads` + `…/complete`; batches tot 100. `GET /v3/assets/search` zoekt gratis stockbeelden en iconen op beschrijving. Bron: https://developers.heygen.com/assets.md, https://developers.heygen.com/docs/upload-assets.md

### 7.2 Webhooks
- Endpoint registreren (`POST /v3/webhooks/endpoints`: HTTPS-`url`, `events[]`; geheim wordt één keer getoond; `…/rotate-secret`). Handtekening: header `signature` = HMAC-SHA256 van de body. Binnen 10 s met 2xx antwoorden; retries tot 24 uur; duplicaten mogelijk (dedupe op `event_type` + id of `callback_id`). 24 eventtypes, o.a. `avatar_video.success|fail`, `video_translate.success|fail`, `instant_avatar.success|fail`, `video_generation.success|fail`, `ai_clipping.success|fail`. Bron: https://developers.heygen.com/docs/webhooks.md, https://developers.heygen.com/docs/webhook-events.md

### 7.3 Durable workflows (HeyGen als orchestrator)
- **Wat:** een graaf van HeyGen-stappen definiëren en als geheel laten draaien (`POST /v3/workflows` met versies, `POST /v3/workflow-runs` met `inputs`, `GET …/nodes`, node-catalogus via `GET /v3/workflows/node-types`). Runs zijn "durable" (overleven storingen).
- **Kosten:** per stap zoals los; niet apart vermeld.
- **Bron:** OpenAPI (geen aparte docpagina gevonden in de index).
- **Opmerking:** overlapt met onze eigen orchestrator (fase 8), maar dekt alleen HeyGen-stappen, niet Claude, fal.ai of Shotstack.

### 7.4 Account, limieten, sleutels
- `GET /v3/users/me`: `billing_type` `wallet | subscription | usage_based`, saldo (`wallet.remaining_balance`, `currency` `usd | credits`). Dit is de manier om werkelijke kosten te meten.
- Limieten (pay-as-you-go): 10 gelijktijdige video's; `POST /v3/videos` 10/s; status-polling 500/min; 429 met `Retry-After` en `X-RateLimit-*`-headers. Enterprise: 20 slots plus "burst" (+5 tot +50, 1,5× tarief).
- API-sleutels met scopes `resource:read` / `resource:write` (resources: account, ai_clipping, assets, avatars, brand, filler_removal, hyperframes, images, lipsync, templates, translations, video_agent, videos, voices, webhooks). Een sleutel met alleen `videos:write` en `voices:read`/`avatars:read` volstaat voor onze presentatorstap.
- Stripe-projecten: een wallet voor API-gebruik aanmaken namens een gebruiker (voor agents/platforms).
- **Bron:** https://developers.heygen.com/user-profile.md, https://developers.heygen.com/docs/usage-limits, https://developers.heygen.com/docs/burst.md, https://developers.heygen.com/docs/api-key-permissions.md, https://developers.heygen.com/docs/stripe-projects.md

### 7.5 Overig
- Video quality comparison: twee video's paarsgewijs laten beoordelen door een judge-model (`POST /v3/video-quality/comparisons`). Niet nodig voor ons product; mogelijk handig om engines te vergelijken.
- MCP-server, CLI en Agent Skills: HeyGen aansturen vanuit AI-agents en de terminal. Niet relevant voor de app zelf.
- Legacy v1/v2-endpoints (`/v1/audio/*`, `/v2/videos`, `/v2/video_translate`, `/v1/video_agent/generate`): niet gebruiken; sunset 31 oktober 2026.
