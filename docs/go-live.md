# Clipelle live zetten: het ene plan

Bijgewerkt op 25 oktober 2026. Dit document vervangt het losse stappenplan uit de chat; `docs/stage8-plan.md` §10 blijft de technische checklist erachter.

Per stap staat wie hem doet:

- **Claude**: voert hij uit met de terminal of de Chrome-extensie.
- **Tijs**: moet jij doen. Het gaat dan om een account aanmaken, een wachtwoord of sleutel invullen, of iets kopen. Dat doet Claude bewust niet.

Vink af wat klaar is: ☐ wordt ☑.

## De vaste regels

1. **Sleutels staan maar op drie plekken:** `.env.local` (je computer, ontwikkeling), `.env.prod` (je computer, productie) en Vercel (live). Nooit in de chat, nooit in git. Elk `.env`-bestand behalve `.env.example` staat in `.gitignore`.
2. **Gebruik `.env.prod`, niet `.env.production`.** Next.js laadt `.env.production` automatisch bij `npm run build`. Een lokale build zou dan met de productiedatabase praten.
3. **Het adres van de live site is `https://www.clipelle.com`.** `clipelle.com` stuurt door naar www, en webhooks van HeyGen, Stripe, fal en Inngest volgen zo'n doorverwijzing niet. Gebruik daarom overal de www-versie: Supabase, Stripe-webhook, Inngest en de variabelen hieronder. Wil je het adres zonder www, zet het dan eerst in Vercel als hoofddomein en pas dit document aan.
4. Nieuwe scripts voor de livegang (alle lezen `.env.prod` en tonen geen sleutels):
   - `npm run db:migrate:prod`: alle databasemigraties naar het productieproject.
   - `npm run examples:upload:prod`: de voorbeeldvideo's naar de openbare bucket `examples` van productie.
   - `npm run heygen:webhook`: registreert de HeyGen-webhook voor `https://www.clipelle.com` en zet het geheim zelf in `.env.prod`.
   - `npm run vercel:env`: zet alle variabelen uit `.env.prod` in Vercel (Production). Het weigert als demomodus aanstaat, als de adressen niet https zijn of als Shotstack nog op de sandbox staat. Tijs draait het, omdat het jouw sleutels naar Vercel stuurt.

## Overzicht

| Fase | Wat | Wie | Stand |
|---|---|---|---|
| 1 | Domein | Tijs | ☑ clipelle.com bij GoDaddy, wijst naar Vercel |
| 2 | Echte tests (≈ $1) | Claude | ☑ beide gelukt, zie het verslag onderaan |
| 3 | Inhoud verzamelen | Tijs | ☐ |
| 4 | Supabase productie | Tijs + Claude | ☑ project `clipelle-prod` (27 okt), tabellen en voorbeeldvideo's erin, beveiligingstest groen |
| 5 | Resend (e-mail) | Tijs | ◐ DNS-records staan er al |
| 6 | Supabase Auth in het nieuwe project | Tijs + Claude | ☐ |
| 7 | Stripe testmodus | Tijs + Claude | ☐ |
| 8 | Reditus | Tijs + Claude | ☐ |
| 9 | Inngest Cloud | Tijs + Claude | ☐ |
| 10 | Productiesleutels HeyGen, Shotstack, fal, Anthropic | Tijs + Claude | ☐ |
| 11 | Vercel en live zetten | Tijs + Claude | ◐ project bestaat, live site draait nog in demomodus |
| 12 | Controle | Claude + Tijs | ☐ |
| 13 | Echt live (Stripe live) | Tijs + Claude | ☐ |

## Fase 1. Domein ☑

- ☑ clipelle.com staat bij GoDaddy (DNS: domaincontrol.com) en wijst naar Vercel. www.clipelle.com is het hoofdadres.
- ☐ **Tijs:** zet automatisch verlengen en tweestapsverificatie aan in je GoDaddy-account.

## Fase 2. Echte tests (Claude)

- ☑ Testcredits: je eigen account (tijskrops2005@gmail.com) staat in de ontwikkeldatabase op het plan Starter en heeft 300 testcredits (referentie `dev-test-credits-2026-10-25`). Er is geen code veranderd. Het gratis plan laat geen vertalingen toe, vandaar Starter.
- ☑ Test A: vertaling van de video van 8 s, Engels → Nederlands, Speed, 9:16.
- ☑ Test B: advertentie van 30 s met de Madison-jurk, Nederlands, Standard, presentator Olivia, stem Sharon.
- ☐ **Tijs:** bekijk beide video's en zeg wat je van beeld, ondertitels en timing vindt.
- ☐ **Claude, na jouw akkoord:** de tarieven in `src/lib/pricing.ts` gelijktrekken met wat HeyGen echt rekende. Dat gebeurt met de echte bedragen uit `/dev/costs`.

## Fase 3. Inhoud (Tijs)

De map `content-inbox/` bestaat al, met invulformulieren:

- `reviews.md`: per review de tekst, naam, functie, sterren, een eventuele foto en de toestemmingsregel. `review-request.md` bevat openingszinnen die je naar klanten kunt sturen.
- `brands.md`: merken die toestemming geven voor hun logo, met het logobestand ernaast.
- `numbers.md`: alleen cijfers die je kunt aantonen. De homepage telt daarnaast zelf live mee (`PUBLIC_STATS_MIN`).
- `press.md`: alleen echte artikelen.
- `links.md`: je social media, de aanmeldlink van Reditus, de done-for-you-service en extra voorbeeldvideo's.
- `stories/_template/`: kopieer deze map per klantverhaal. `permission.txt` is verplicht.
- Video's mogen in `content-inbox/videos/`.

Je bedrijfsgegevens (Tijs Krops, Sluitgatweg 10, Nagele, KvK 97223344, btw NL005256557B94) staan al in `src/content/company.ts`. Stuur alleen wijzigingen.

**Klaar als:** je "importeer de content-inbox" zegt en Claude het op de site zet.

## Fase 4. Supabase productie

1. ☑ **Tijs:** maak in Supabase een nieuw project aan in Frankfurt (eu-central-1), met een sterk databasewachtwoord uit je wachtwoordmanager. (`clipelle-prod`, Data API uit, automatische RLS aan.)
2. ☐ **Tijs:** zet het project op Pro (ongeveer $25 per maand), zodat het niet pauzeert.
3. ☑ **Tijs:** maak `.env.prod` door `.env.example` te kopiëren: `cp .env.example .env.prod`. Vul deze waarden in:
   - `DATABASE_URL`: Connect → Transaction pooler (poort 6543).
   - `DIRECT_DATABASE_URL`: Connect → Session pooler (poort 5432).
   - `NEXT_PUBLIC_SUPABASE_URL`: Project Settings → API → Project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Project Settings → API Keys → Publishable key.
   - `SUPABASE_SECRET_KEY`: Project Settings → API Keys → Secret key.
   - Laat `STORAGE_BUCKET` leeg; het nieuwe project krijgt de privébucket `clipelle`.
4. ☑ **Claude:** `npm run db:migrate:prod`. Dat maakt alle tabellen aan, met RLS standaard dicht.
5. ☑ **Claude:** `npm run examples:upload:prod`. Dat maakt de openbare bucket `examples` aan en zet de voorbeeldvideo's erin.
6. ☑ **Claude:** de beveiligingstest (`src/lib/db/security.test.ts`) draaien tegen productie. Alle tabellen moeten dicht zijn voor de publieke sleutel.
7. ☑ Niet nodig: de Data API staat in dit project helemaal uit.

**Klaar als:** de tabellen bestaan en de beveiligingstest groen is.

## Fase 5. Resend

1. ☑ De records voor `send.clipelle.com` (SPF en MX) staan al in je DNS.
2. ☐ **Tijs:** controleer in Resend → Domains dat clipelle.com op Verified staat.
3. ☐ **Tijs:** maak onder API Keys een sleutel met alleen verzendrechten en zet hem in `.env.prod` als `RESEND_API_KEY`. Zet hem ook in `.env.local` als je lokaal mail wilt testen.
4. ☐ **Tijs:** zet in `.env.prod` ook deze waarden:
   - `EMAIL_FROM=Clipelle <hello@clipelle.com>`
   - `NOTIFY_EMAIL=` het adres waar aanvragen binnenkomen
   - `NEXT_PUBLIC_SUPPORT_EMAIL=hello@clipelle.com`

## Fase 6. Supabase Auth (in het nieuwe project)

Het huidige project is al ingesteld; het nieuwe project moet hetzelfde krijgen.

1. ☐ **Claude via Chrome:** Authentication → URL Configuration:
   - Site URL: `https://www.clipelle.com`
   - Redirect URLs: `https://www.clipelle.com/auth/callback`, `https://www.clipelle.com/auth/callback?next=/reset-password` en `http://localhost:3001/auth/callback`
2. ☐ **Claude via Chrome:** Email Templates. Gebruik de teksten uit `docs/email-templates/` (Clipelle-stijl, met een inlogcode in plaats van een link).
3. ☐ **Tijs:** SMTP met host `smtp.resend.com`, poort `465`, gebruiker `resend`, en als wachtwoord je Resend-sleutel. Afzender: `hello@clipelle.com`, naam: Clipelle. Het wachtwoord vul jij in; dat mag Claude niet.
4. ☐ **Tijs:** Google-login. Voeg in Google Cloud Console bij je OAuth-client de redirect-URI van het nieuwe project toe (`https://<nieuw-project>.supabase.co/auth/v1/callback`). Plak client-id en secret in Supabase onder Providers → Google. `NEXT_PUBLIC_AUTH_GOOGLE=true` staat in `.env.prod`.

**Klaar als:** aanmelden een code van hello@clipelle.com stuurt en inloggen werkt.

## Fase 7. Stripe (testmodus)

1. ☐ **Tijs:** maak een Stripe-account en start meteen de bedrijfsverificatie; dat kan dagen duren.
2. ☐ **Tijs:** zet een beperkte testsleutel (`rk_test_…`, aanbevolen; rechten in `docs/stage8-plan.md` punt 32) of de geheime testsleutel (`sk_test_…`, onder Developers → API keys) in `.env.local` én `.env.prod` als `STRIPE_SECRET_KEY`.
3. ☐ **Claude:** `npm run stripe:setup`. Dat maakt Starter, Pro, Scale, Business en de creditpakketten aan, met de jaarprijzen $16, $49 en $133 per maand. Gewijzigde bedragen worden vervangen.
4. ☐ **Claude, na jouw ja:** de Stripe CLI installeren (`brew install stripe/stripe-cli/stripe`). Daarna doe jij `stripe login` en draai jij `stripe listen --forward-to localhost:3001/api/billing/webhook`. Zet het getoonde `whsec_…` in `.env.local` als `STRIPE_WEBHOOK_SECRET`.
5. ☐ **Tijs:** Settings → Billing → Customer portal aanzetten.
6. ☐ **Claude:** een testbetaling in de app met testkaart `4242 4242 4242 4242`, en controleren dat de credits erbij komen.
7. ☐ **Na fase 11, Tijs:** maak onder Developers → Webhooks het endpoint `https://www.clipelle.com/api/billing/webhook` aan, met de events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Zet het nieuwe `whsec_…` in `.env.prod`.

## Fase 8. Reditus

1. ☐ **Tijs:** controleer de afspraken in Reditus:
   - 25% commissie, alleen op abonnementen;
   - levenslang zolang de klant abonnee blijft;
   - maandelijkse uitbetaling, vanaf $50.
2. ☐ **Tijs:** stuur de openbare aanmeldlink voor partners en de script-URL. **Claude** zet die in `src/content/partners.ts` (`signupUrl`) en `.env.prod` (`NEXT_PUBLIC_REDITUS_SCRIPT_SRC`).
3. ☐ Koppel Stripe aan Reditus pas in fase 13.

## Fase 9. Inngest Cloud

1. ☐ **Tijs:** maak een account op inngest.com met de omgeving Production.
2. ☐ **Tijs:** zet `INNGEST_EVENT_KEY` en `INNGEST_SIGNING_KEY` in `.env.prod`. Zet `INNGEST_DEV` nooit in productie.
3. ☐ **Claude via Chrome, na fase 11:** synchroniseer de app met `https://www.clipelle.com/api/inngest`, en controleer dat de functies zichtbaar zijn.

## Fase 10. Productiesleutels

1. ☐ **Tijs:** HeyGen. Maak een nieuwe API-sleutel voor productie (gebruik de testsleutel niet opnieuw) en zet tegoed op het API-saldo. Zet hem in `.env.prod` als `HEYGEN_API_KEY`.
2. ☐ **Tijs:** Shotstack. Maak een productiesleutel en neem een plan of tegoed, anders blijft het watermerk staan. Zet `SHOTSTACK_API_KEY` en `SHOTSTACK_ENV=v1` in `.env.prod`.
3. ☐ **Tijs:** fal.ai en Anthropic. Maak eigen productiesleutels (`FAL_KEY`, `ANTHROPIC_API_KEY`) en zet bij beide een uitgavenlimiet in het dashboard.
4. ☐ **Claude:** `npm run heygen:webhook`. Dat registreert `https://www.clipelle.com/api/webhooks/heygen` en zet `HEYGEN_WEBHOOK_SECRET` in `.env.prod`, zonder het geheim te tonen.

## Fase 11. Vercel en live zetten

Het project `clipelle-website` (team tijs-krops) bestaat al en is gekoppeld aan GitHub. Elke push naar `main` zet een nieuwe versie live. Zonder database-variabelen draait de site in demomodus, zoals nu.

1. ☐ **Tijs:** zet Vercel op Pro; Hobby mag niet voor commercieel gebruik.
2. ☐ **Claude via Chrome:** zet onder Settings → Functions de regio op Frankfurt (fra1).
3. ☐ **Tijs:** vul de rest van `.env.prod` aan:
   - `NEXT_PUBLIC_DEMO_MODE=false` (anders draait de live site in demomodus)
   - `APP_BASE_URL=https://www.clipelle.com`
   - `NEXT_PUBLIC_SITE_URL=https://www.clipelle.com`
   - `ADMIN_EMAILS=tijskrops2005@gmail.com`
   - `MAX_COST_PER_ACTION_USD=1.50`
   - `MAX_COST_PER_CREATIVE_USD=1.50`
   - `MAX_COST_PER_USER_PER_DAY_USD=10`
   - `MAX_COST_PER_USER_PER_MONTH_USD=100`
   - `FREE_ADS_PER_DAY=10`
   - `PUBLIC_STATS_MIN=50`
4. ☐ **Tijs:** `npx vercel login` en `npx vercel link` (kies `clipelle-website`). Daarna `npm run vercel:env -- .env.prod --dry-run` om te zien wat er wordt verstuurd, en dan `npm run vercel:env`.
5. ☐ **Claude:** `npm run check:secrets`, de build lokaal controleren en dan pushen naar `main`. Vercel zet het live.
6. ☐ **Claude:** controleren dat `https://www.clipelle.com/api/health` antwoordt met `demoMode: false`, `database: true` en `jobs: true`.
7. ☐ Daarna fase 6 (Site URL), fase 7 punt 7 (Stripe-webhook) en fase 9 punt 3 (Inngest-sync).

## Fase 12. Controle (Claude, met jou)

1. ☐ De site en `/new/ad` bekijken op telefoonbreedte.
2. ☐ Een testaccount met een echt e-mailadres: aanmelden, code invoeren, de gratis advertentie maken.
3. ☐ Een testabonnement met de testkaart: credits, portaal en opzeggen controleren.
4. ☐ Eén echte advertentie en één vertaling op productie, met kosten en resultaat nagelopen.
5. ☐ Vijf blogartikelen op feiten nalezen.
6. ☐ **Tijs:** de juridische teksten in `src/content/legal/` laten nakijken.
7. ☐ Zonder toestemming in de cookiebanner laden geen scripts van analytics of Reditus.

## Fase 13. Echt live

1. ☐ **Tijs:** de Stripe-verificatie afronden.
2. ☐ **Claude:** een live-modus voor Stripe bouwen achter een expliciete variabele, met tests. Nu weigert de app live sleutels bewust.
3. ☐ **Tijs:** de live sleutel en het live webhookgeheim in `.env.prod` zetten, daarna `npm run vercel:env`. **Claude** draait `stripe:setup` live.
4. ☐ **Tijs:** Stripe koppelen aan Reditus.
5. ☐ **Tijs:** één echte betaling met je eigen kaart, en die terugbetalen.
6. ☐ De eerste klanten uitnodigen.

## Verslag van de tests (25 oktober 2026)

Beide tests zijn gelukt en staan op het account tijskrops2005@gmail.com. Je vindt ze onder Projects; de video's lopen ook langs in "Now creating" op het dashboard zolang ze gemaakt worden.

| | Test A: vertaling 8 s EN → NL | Test B: advertentie 30 s NL |
|---|---|---|
| Resultaat | 1080×1920, 6,7 s (stilte weggeknipt), ondertitels | 1080×1920, 25,6 s, Olivia met de stem Sharon, de jurk twee keer in beeld, ondertitels |
| Schatting in de app | $0,30 | $0,68 |
| Kosten volgens de kostenbewaking | $0,27 | $0,51 (+ $0 Shotstack-sandbox) |
| Echt afgeschreven | HeyGen samen ≈ $0,71 (saldo $4,18 → $3,47), plus fal $0,26 en Claude ≈ $0,04: totaal ≈ $1,01 voor beide tests | |
| Tijd | Vertaalstap 1,5 min. De ondertitels duurden lang: de Shotstack-sandbox was ruim 15 minuten bezig. | Script, clip en presentator 1,5 min. De eindmontage duurde 19 min, ook door de sandbox. |

Bevindingen:

1. **De presentator is duurder dan de app rekent.** HeyGen schreef ≈ $0,71 af, terwijl onze kostenbewaking $0,47 aan HeyGen-kosten registreerde. De tarieven in `src/lib/pricing.ts` moeten omhoog voor Avatar III en IV; vertalen mag omlaag. Dit wacht op het akkoord van Tijs.
2. **Shotstack-sandbox:** het omzetten van de ondertitels naar een video ("preprocessing") duurde ruim 15 minuten. Zonder ondertitels was dezelfde render in 30 seconden klaar. In productie (`SHOTSTACK_ENV=v1`, betaald) is dat naar verwachting veel sneller; dat controleren we in fase 12.
3. **Vertaalkwaliteit:** de Nederlandse tekst begint met "Kamo, mijn dokter zegt al jaren…". Het woord "Kegels" uit het origineel is verkeerd verstaan, en de automatische controle heeft dat niet opgemerkt. Te onderzoeken: de controle beter laten letten op ontbrekende vakwoorden, en het veld "Woorden om niet te vertalen" aanraden bij merk- en vaktermen.
4. **Testlogo:** in test B staat rechtsboven een oranje vierkantje. Dat is het testlogo uit de merkinstellingen van het testaccount. Geen fout in de app.
5. **Twee fouten gevonden en hersteld:**
   - Een advertentie die werd afgebroken tussen het opslaan van de video en het afronden van het project, bleef voor altijd op "processing" staan. Een herstart rondt hem nu af.
   - Bij een afgeronde vertaling gingen de klaar-e-mail en de webhook `project.completed` niet uit. Dat gebeurt nu wel.

Accounts samengevoegd: alle projecten van het oude ontwikkelaccount en van Tester A staan nu op tijskrops2005@gmail.com. Zichtbaar zijn Gracewear London, Senvia, test A en test B; de 13 technische testprojecten zijn gearchiveerd (terug te halen op Projects via "Archived"). Je werkruimte staat in de ontwikkeldatabase op Starter, met 279 testcredits.
