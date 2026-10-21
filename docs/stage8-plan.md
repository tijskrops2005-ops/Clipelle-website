# Fase 8: beide workflows echt laten werken met één klik

Datum: 19 oktober 2026. Status: **voorstel, wacht op akkoord. Er is nog niets gebouwd.**
Feiten over prijzen en limieten komen van de officiële pagina's op de peildatum (links per onderdeel).

## 1. Wat fase 8 oplevert

Een klant klikt "Generate video" of "Start translation", sluit de laptop, en vindt later een afgeronde video in de app. Daarvoor moet alles wat nu op de `/dev`-testpagina's handmatig gebeurt (starten, wachten, pollen, URL's overnemen, kosten bijhouden) op de server gebeuren, onafhankelijk van de browser, met opslag die niet verloopt en met herstel bij fouten.

**Workflow A (advertentie vanaf productfoto):** script (Claude) → productclip (fal.ai) en presentator (HeyGen) tegelijk → montage met ondertitels als enige tekst, zonder muziek (Shotstack) → opslag → klaar.

**Workflow B (bestaande video vertalen):** upload → vertalen met behoud van stem en lipsync (HeyGen proofread-sessie) → *optioneel* wachten op correctie ("Review before rendering"; zonder vinkje zet Claude de vertaling automatisch in advertentietoon) → video genereren (HeyGen) → *optioneel* beeldverbetering (fal.ai Topaz) → ondertitels in TikTok-stijl, formaat origineel of 9:16 (Shotstack) → opslag → klaar. De beelden en de montage blijven exact hetzelfde; alleen de taal verandert.

## 2. Aanbeveling per onderdeel

| Onderdeel | Keuze | Waarom | Kosten bij start | Account |
|---|---|---|---|---|
| Database | **Supabase Postgres** met **Drizzle ORM** | Gewone Postgres (geen lock-in), één account dat later ook opslag en inloggen levert, gratis plan. Drizzle: typeveilige tabellen in TypeScript, migraties in git. | Gratis: 500 MB database, 2 projecten. Let op: een gratis project pauzeert na 1 week zonder verkeer (één klik om te hervatten). Pro $25/mnd als dat stoort. | Supabase |
| Opslag | **Supabase Storage** achter een eigen `storage.ts` | Zelfde account, signed upload-URL's (browser uploadt rechtstreeks, niet via onze server), 1 GB gratis. Bij groei naar **Cloudflare R2** (10 GB gratis, geen egress-kosten) zonder dat de app verandert: alles loopt via één interface (`put`, `signedUploadUrl`, `signedDownloadUrl`, `copyFromUrl`). | Gratis: 1 GB opslag, 5 GB uitgaand verkeer per maand, max 50 MB per bestand. Genoeg voor tientallen testvideo's. | Supabase |
| Achtergrondtaken | **Inngest** | Duurzame functies met stappen: elke stap wordt bewaard, bij een fout wordt alleen die stap opnieuw geprobeerd (standaard 3 keer, met wachttijd). `step.waitForEvent` laat een keten dagen wachten op jouw correctie of op een webhook zonder dat er een server draait. Draait lokaal met één commando (`npx inngest-cli dev`), zonder account of tunnel. | Gratis: 50.000 uitvoeringen per maand (elke stap telt als één), 5 gelijktijdige stappen, runs mogen 30 dagen duren. Pro $99/mnd pas bij echt volume. | Inngest (alleen voor productie) |
| Webhooks | Eén route per leverancier onder `/api/webhooks/` met handtekeningcontrole en dedupe in de database; **polling blijft het vangnet** | HeyGen tekent met HMAC-SHA256 (geheim per geregistreerd endpoint), fal.ai met ED25519-sleutels van hun JWKS-URL, Shotstack tekent niet (we bevestigen de status met een GET). Zie §4. | Gratis. | Geen |
| Orchestrator | Twee Inngest-functies, `workflow/ad` en `workflow/translate`, één stap per pipeline-stap; de database is de waarheid, de UI leest alleen | Zelfde stappen en statussen als de demo-runner, nu op de server. Retry per stap = dezelfde functie opnieuw starten vanaf die stap. | Gratis. | Geen |
| Kostenbewaking | Zelfde `reserveSpend`/`settleSpend`, maar tabel `cost_entries` in plaats van het JSONL-bestand | Werkt op Vercel (geen schrijfbaar bestandssysteem), per project optelbaar, zichtbaar op de projectpagina. | Gratis. | Geen |
| Demo mode | Omgevingsvariabele `DEMO_MODE` (server) + `NEXT_PUBLIC_DEMO_MODE` (browser) | Aan: de huidige mock store en runner. Uit: database en orchestrator. Zelfde schermen, zelfde data-interface. | Gratis. | Geen |
| Hosting | **Vercel**, regio Frankfurt | Next.js draait er zonder configuratie, previews per branch, functies tot 300 s (ruim genoeg: elke Inngest-stap duurt seconden, het wachten gebeurt buiten de functie). | Hobby gratis tijdens ontwikkelen, maar **uitsluitend niet-commercieel**. Vóór de eerste klant naar Pro: $20/mnd. | Vercel + GitHub (de repo moet online staan voor automatische deploys) |
| Inloggen | **Gebouwd op 21 oktober 2026: echte accounts (Supabase Auth) in plaats van de toegangscode.** `src/proxy.ts` beschermt de app-pagina's; de datalaag is per gebruiker. | Betaalde acties mogen niet voor iedereen op internet bereikbaar zijn. De `owner_id`-kolom uit deze fase is nu de eigenaar van elk project; de wachtwoordpoort is nooit gebouwd. | Gratis (Supabase Auth, zelfde project). | Geen |

Bronnen: https://supabase.com/pricing, https://www.inngest.com/pricing, https://www.inngest.com/docs/usage-limits/inngest, https://vercel.com/docs/plans/hobby, https://developers.cloudflare.com/r2/pricing/, https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/

**Totaal bij de start: $0 vaste kosten.** Variabel: alleen wat HeyGen, fal.ai, Claude en Shotstack per video rekenen (zie `docs/roadmap.md`). Bij lancering: Vercel Pro $20/mnd; Supabase Pro $25/mnd zodra de opslag boven 1 GB komt of het pauzeren stoort.

## 3. Datamodel (Postgres, via Drizzle)

- `projects`: id, owner_id (nullable, voor later), workflow (`ad | translate`), name, status (`draft | processing | review | completed | failed`), input (jsonb: productnaam, beschrijving, script, talen, kwaliteit, opties zoals review/format/enhance), rights_confirmed_at, created_at, updated_at.
- `steps`: id, project_id, key (`script | productClip | presenter | finalEdit` of `upload | translate | review | enhance | captions`), status, attempt, started_at, finished_at, error (gewone taal), external_job_id, output (jsonb: welke asset, welke taal), cost_usd.
- `assets`: id, project_id, kind (`source | image | script | product_clip | presenter | final | translated | srt | captioned`), language (nullable), storage_path, mime, bytes, seconds, width, height, created_at. **Elk resultaat van een leverancier wordt binnen dezelfde stap naar onze opslag gekopieerd**; de tijdelijke URL van de leverancier wordt nooit opgeslagen.
- `translations`: project_id, language, status, segments (jsonb: index, start, end, original, translated, text), proofread_id, translation_id, asset-ids.
- `cost_entries`: zoals het huidige logboek (service, action, estimated, actual, status, fingerprint, project_id, step_id).
- `webhook_events`: provider, external_id, event_type, received_at, payload (jsonb). Unieke sleutel op (provider, external_id, event_type) voor dedupe.

## 4. Webhooks: hoe het werkt, ook op je laptop

**Productie.** Een leverancier stuurt een POST naar onze URL als een taak klaar is. Onze route doet drie dingen in minder dan een seconde: handtekening controleren, het event opslaan (dubbele berichten negeren) en een Inngest-event sturen (`heygen/video.completed` enzovoort). De wachtende workflow-stap (`step.waitForEvent`) wordt daardoor wakker en gaat verder. Antwoord altijd 200, ook bij een duplicaat.

- **HeyGen:** eenmalig een endpoint registreren (`POST /v3/webhooks/endpoints` met onze URL en de events `avatar_video.*`, `video_translate.*`). HeyGen geeft dan één keer een geheim; dat komt in `HEYGEN_WEBHOOK_SECRET`. Elke levering heeft een header `signature` = HMAC-SHA256 van de body met dat geheim. Wij berekenen hetzelfde en vergelijken in constante tijd.
- **fal.ai:** `webhookUrl` per taak. Headers `X-Fal-Webhook-Request-Id`, `-User-Id`, `-Timestamp`, `-Signature`; de publieke sleutels staan op `https://rest.fal.ai/.well-known/jwks.json`. Wij controleren de ED25519-handtekening over (id, user-id, timestamp, SHA-256 van de body) en weigeren timestamps ouder dan 5 minuten.
- **Shotstack:** veld `callback` per render; **geen handtekening**. We behandelen de callback alleen als "kijk nu", en halen de echte status met `GET /render/{id}` op voordat we iets doen.

**Op je laptop.** Leveranciers kunnen `localhost` niet bereiken. Twee manieren, allebei gebouwd:

1. **Polling (standaard tijdens ontwikkelen, en altijd het vangnet).** Elke wacht-stap wacht maximaal N minuten op een webhook-event en vraagt daarna zelf de status op (`step.sleep` 30 s, dan `GET`), net zolang tot de taak klaar is. Zonder tunnel werkt alles dus gewoon; alleen iets later.
2. **Tunnel (om de echte webhooks te testen).** `cloudflared tunnel --url http://localhost:3001` geeft een tijdelijke publieke URL op `trycloudflare.com`, zonder account, gratis. Die URL zet je in `APP_BASE_URL`; de app registreert het HeyGen-endpoint opnieuw bij het opstarten als de URL veranderd is (de URL wisselt bij elke start van de tunnel). Een `npm run dev:tunnel`-script start tunnel en dev-server samen.

Inngest zelf heeft geen tunnel nodig: de lokale Inngest-dev-server (`localhost:8288`) praat rechtstreeks met de app op `localhost:3001`.

## 5. De twee orchestrators

**`workflow/ad`** (trigger: `project/ad.created`)
1. `script`: Claude schrijft hook, script, voordelen, CTA (of neemt het script van de gebruiker). Cost guard eromheen. Opslaan als asset `script`.
2. Parallel: `productClip` (fal.ai: foto voorbereiden, zo nodig uitbreiden, clip maken; wacht op webhook of poll) en `presenter` (HeyGen avatar-video; wacht op webhook of poll). Elk resultaat direct naar opslag.
3. `finalEdit`: Shotstack-edit met de opgeslagen URL's (signed download-URL's, 24 u geldig), wachten, resultaat naar opslag, project `completed`.

**`workflow/translate`** (trigger: `project/translate.created`)
1. `upload`: de bronvideo staat al in onze opslag (rechtstreeks vanuit de browser); de stap maakt er een HeyGen-asset van.
2. `translate`: proofread-sessie voor alle doeltalen (plus brontaal als transcript); wachten; SRT's ophalen en als segmenten opslaan.
3. `review`: met vinkje "Review before rendering": status `review`, `step.waitForEvent("project/review.approved", timeout 7 dagen)`; na time-out status `failed` met de melding "Review not completed within 7 days" en Retry. Zonder vinkje: Claude herschrijft automatisch in advertentietoon (cost guard), fragmenten over de limiet worden ingekort door Claude in een tweede ronde, anders blijft de letterlijke vertaling staan.
4. `generate`: SRT terugzetten bij HeyGen, genereren per taal, wachten (webhook/poll), video en SRT naar opslag.
5. `enhance` (optioneel): fal.ai Topaz upscale per taal, wachten, naar opslag. Vóór de ondertitels, zodat die scherp blijven.
6. `captions`: Shotstack met de SRT uit onze opslag; formaat 9:16 (`fit: crop`) of origineel (output `size` = breedte × hoogte van de bron, `fit: none`); resultaat naar opslag; project `completed`.

**Retry per stap.** Een stap die faalt na de automatische pogingen zet het project op `failed` met een melding in gewone taal. "Retry this step" stuurt `project/step.retry` met project-id en stapsleutel; de functie start opnieuw, slaat voltooide stappen over (de database zegt wat klaar is) en begint bij de gefaalde stap met `attempt + 1`. Alle stappen zijn daarom idempotent: ze kijken eerst of hun resultaat al bestaat.

**Dubbele starts.** De "Generate"-knop maakt het project in de database (status `processing`) en stuurt pas daarna het event; een tweede klik ziet het bestaande project. De cost guard houdt met zijn fingerprint bovendien een identieke betaalde aanroep binnen 10 minuten tegen.

## 6. Onderzoek: nieuwe creatives uit een bestaande video (niet bouwen)

Uitgangspunt: de rechtenbevestiging geldt voor elke variant (stem en gezicht van de spreker worden hergebruikt). Vier varianten, alle met onze huidige diensten:

| Variant | Aanpak | Indicatie per video van 30 s | Past in |
|---|---|---|---|
| **Nieuwe hook-tekst** (zelfde beelden, zelfde spraak) | Claude schrijft 3 hooks; Shotstack zet ze als sticker over de eerste 2 s en rendert 3 bestanden. | ≈ $0,10 per variant (alleen Shotstack) | Workflow B als extra optie "hook variants", of Workflow A-montage op een bestaande video |
| **Nieuwe gesproken hook** (eerste 3 s opnieuw ingesproken) | Stem klonen uit de bronvideo (`POST /v3/voices/clone`), nieuwe hook als spraak (`POST /v3/voices/speech`), lipsync alleen op 0–3 s (`POST /v3/lipsyncs` met `start_time`/`end_time`), Shotstack captions. | ≈ $0,15 + stemkloon (prijs niet gepubliceerd; eerst testen) | Workflow B, optie "re-voice the hook" |
| **Ander script, zelfde beelden** (zelfde spreker) | Claude schrijft een script met dezelfde lengte (woorden per seconde van het origineel als doel), gekloonde stem spreekt het in, HeyGen lipsync op de hele video (speed ≈ $0,75 / precision ≈ $1,50 per 30 s), Shotstack captions. Risico: de nieuwe spraak moet even lang zijn als de video; Claude krijgt een harde woordlimiet en HeyGen `speed` 0,5–1,5 corrigeert de rest. Te verifiëren in een betaalde test: accepteert lipsync audio die iets korter of langer is. | ≈ $0,80–1,60 per variant | Workflow B als derde modus naast "vertalen" |
| **Andere presentator** (zelfde script, zelfde B-roll) | Script transcriberen (HeyGen proofread in de brontaal, ≈ $0,13), HeyGen avatar-video met dat script (Avatar IV ≈ $1,50, Avatar III ≈ $0,25 per 30 s), de productbeelden uit de bronvideo als B-roll in de Shotstack-montage. | ≈ $0,40–1,70 per variant | Workflow A met "use footage from an existing video" als invoer in plaats van een productfoto |

**Aanbeveling voor later:** begin met de goedkoopste twee (nieuwe hook-tekst, nieuwe gesproken hook); dat zijn kleine toevoegingen aan Workflow B. "Ander script, zelfde beelden" is de waardevolste variant en vraagt één betaalde test van de stemkloon en de lipsync-lengte. Bronnen: `docs/vendors/heygen/capabilities.md` §3 (stemmen), §4.2 (lipsync), `docs/vendors/fal/capabilities.md`, `docs/vendors/shotstack/capabilities.md`.

## 7. Werkverdeling: kleine stappen, elk een eigen commit

| # | Stap | Wat je daarna kunt zien |
|---|---|---|
| 1 | **Database.** Supabase-project (jij maakt het aan), Drizzle-schema voor de zes tabellen, migraties, `src/lib/db.ts`, `.env.example` met `DATABASE_URL` en de Supabase-sleutels. | `npm run db:migrate` maakt de tabellen; `/dev/db` toont de verbinding. |
| 2 | **Opslag.** `src/lib/storage.ts` (Supabase Storage), signed upload vanuit de browser, `copyFromUrl` die een leveranciersresultaat naar onze opslag haalt, `assets`-rijen. Plus een **opslagmeter**: som van alle bestandsgroottes in onze bucket (uit `storage.objects`) tegenover de 1 GB van het gratis plan, op `/dev/storage` en als regel op Settings. | Op `/dev/translate` komt de upload in onze opslag en verschijnt daar ook de Shotstack-sandboxrender; de meter loopt mee. |
| 3 | **Kostenbewaking naar de database.** Zelfde functies, tabel in plaats van bestand; SpendMeter leest uit de database; `.reelay/` verdwijnt. | Dezelfde meter op elke testpagina, nu ook per project. |
| 4 | **Inngest-basis.** Client, route `/api/inngest`, `npm run dev:jobs` voor de lokale dev-server, één testfunctie met een stap en een retry. | `localhost:8288` toont de run met stappen en pogingen. |
| 5 | **Data-laag en demo-schakelaar.** `src/lib/data/` met twee implementaties (mock, database) achter één interface; API-routes voor projecten; schermen lezen via die laag; `DEMO_MODE` aan/uit. | Demo uit: lege projectenlijst uit de database; demo aan: alles als nu. |
| 6 | **Workflow A-orchestrator** met polling (nog geen webhooks): script → productclip ‖ presentator → montage, elk resultaat naar opslag, statussen live op de projectpagina. | Eén klik op "Generate video" levert een echte advertentie (betaalde test, met jouw go). |
| 7 | **Workflow B-orchestrator**: upload → vertalen → review (optioneel, met wachten) of automatische advertentietoon → genereren → enhance (optioneel) → captions met formaatkeuze. Formulier krijgt de vinkjes "Review before rendering", "Enhance picture quality" en de keuze "Keep original format / 9:16". | Eén klik op "Start translation" levert een vertaalde video per taal. |
| 8 | **Webhooks** voor HeyGen, fal.ai en Shotstack met handtekeningcontrole, dedupe-tabel en Inngest-events; polling blijft als vangnet; `npm run dev:tunnel` met cloudflared; HeyGen-endpoint automatisch registreren. | Stappen gaan verder zodra de leverancier klaar is, zonder te wachten op de volgende poll. |
| 9 | **Retry per stap en foutteksten.** Retry-knop stuurt het retry-event; elke leveranciersfout krijgt een melding in gewone taal; time-outs. | Een gefaalde stap kan vanaf de projectpagina worden hervat. |
| 10 | **Vervallen: toegangscode.** Vervangen door accounts (Supabase Auth, 21 oktober 2026). Beveiligingskoppen blijven voor de deploy. | Zonder sessie ga je naar /login. |
| 11 | **Deployment-voorbereiding.** GitHub-repo, Vercel-project (Frankfurt), omgevingsvariabelen, Inngest Cloud gekoppeld, Supabase-productieproject, checklist in `docs/deploy.md`. **Vóór de eerste en elke volgende push:** een pre-push-controle (`npm run check:secrets`, ook als git-hook) die faalt als `.env*` (behalve `.env.example`), `.reelay/`, logbestanden of iets dat op een sleutel lijkt (`sb_secret_`, `sk-ant-`, lange hex-/base64-reeksen) in de te pushen commits of de werkmap zit; plus `git ls-files` tegen `.gitignore` nalopen. | De app draait op een `vercel.app`-URL met demo mode uit; de push-controle is zichtbaar geslaagd. |

Elke stap: eerst de relevante bestanden lezen, dan de wijziging, dan lint/typecheck/build en een controle in de browser, dan commit. Betaalde tests alleen met jouw go per keer, met de cost guard aan.

## 8. Wat jij moet aanmaken (allemaal gratis bij de start)

Afgesproken op 19 oktober 2026: plan akkoord, met de opslagmeter (stap 2) en de push-controle op sleutels en logs (stap 11, en als vaste regel vóór elke push).

**Stand 19 oktober 2026:** stappen 1 t/m 7 gebouwd en gecommit. Beide orchestrators zijn zonder betaalde aanroepen getest (cost guard op $0): de keten start, slaat voltooide stappen over bij een retry, en meldt een weigering in gewone taal. Stap 8 (webhooks) is de volgende.

1. **Supabase**: account en één project (regio EU, Frankfurt). Uit het dashboard komen `DATABASE_URL` (connection string, pooler), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (alleen server) en `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Zet ze in `.env.local`; ik lees ze niet.
2. **Inngest**: account pas nodig bij stap 11 (productie). Lokaal werkt het zonder.
3. **GitHub**: account en een privé-repository; ik push de bestaande git-geschiedenis.
4. **Vercel**: account gekoppeld aan GitHub; eerst Hobby.
5. **cloudflared**: alleen installeren (`brew install cloudflared`), geen account.
6. Bestaand: HeyGen-webhookgeheim komt uit de endpoint-registratie in stap 8, niet uit het dashboard.

## 9. Wat bewust buiten fase 8 blijft

Echte gebruikersaccounts en betalingen, e-mailnotificaties, meerdere varianten in batch (U3), muziekbibliotheek (U6), de creatives-varianten uit §6, uploads boven 32 MB naar HeyGen, en Cloudflare R2 (pas als de opslag dat vraagt).

## 10. Deploy-checklist voor accounts, e-mail en betalingen (21 oktober 2026)

**Supabase Auth (dashboard → Authentication)**
1. URL configuration: *Site URL* = het echte domein (bijv. `https://app.example.com`); *Redirect URLs*: `https://<domein>/auth/callback`, `https://<domein>/auth/callback?next=/reset-password` en voor lokaal `http://localhost:3001/auth/callback`.
2. Providers → Email: *Confirm email* aan; *Secure email change* aan. Magic link blijft aan (standaard). Google alleen als `NEXT_PUBLIC_AUTH_GOOGLE=true`: client-id en secret in Supabase invullen.
3. Email templates (teksten in eigen woorden, Engels, geen leveranciersnamen): *Confirm signup* ("Verify your e-mail", knop "Verify and open Reelay", link `{{ .ConfirmationURL }}`), *Magic Link* ("Your sign-in link"), *Reset Password* ("Choose a new password", link naar `/auth/callback?next=/reset-password` via `{{ .ConfirmationURL }}`), *Change Email*. Zet onder SMTP een eigen afzender (de ingebouwde mailer heeft een laag uurplafond).
4. Rate limits (Authentication → Rate limits): laat de standaard staan; onze eigen limiet is 10 per adres per 10 minuten per actie.
5. `.env` op de server: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_MODE=false`, de Supabase-sleutels, `MAX_COST_PER_USER_*`, `FREE_ADS_PER_DAY`.

**Stripe (testmodus tot de lancering)**
6. `STRIPE_SECRET_KEY=sk_test_…` zetten en `npm run stripe:setup` draaien (maakt producten en prijzen met lookup keys, zie `docs/pricing-model.md` §6).
7. Developers → Webhooks: endpoint `https://<domein>/api/billing/webhook`, events `checkout.session.completed`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; signing secret als `STRIPE_WEBHOOK_SECRET`. Lokaal: `stripe listen --forward-to localhost:3001/api/billing/webhook`.
8. Settings → Billing → Customer portal aanzetten (plan wijzigen, opzeggen, facturen).

**E-mail voor demo- en contactaanvragen**
9. `RESEND_API_KEY`, `EMAIL_FROM` (geverifieerd domein) en `NOTIFY_EMAIL` zetten; zonder deze worden aanvragen alleen opgeslagen (zichtbaar op `/dev/demo-requests` in development).

**Domein en bestanden**
10. Domein koppelen. De voorbeeldvideo's staan niet in git maar in de openbare storage-bucket `examples` (`npm run examples:upload` zet alles uit `public/examples/` erin); de site leidt de URL af van `NEXT_PUBLIC_SUPABASE_URL`, of gebruikt `NEXT_PUBLIC_EXAMPLES_BASE_URL` als die gezet is.
11. Vóór elke push: `npm run check:secrets`.
