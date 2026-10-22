# Hernoeming naar Clipelle (22 oktober 2026)

De merknaam is overal in code, teksten, metadata en documentatie "Clipelle". Eén bron: `src/lib/brand.ts` (naam, tagline, beschrijving, supportnaam, afzendernaam, blogauteur, `siteUrl()` uit `NEXT_PUBLIC_SITE_URL`, `supportEmail()` uit `NEXT_PUBLIC_SUPPORT_EMAIL`, `emailFrom()` uit `EMAIL_FROM`). Nergens staat een domein of e-mailadres hard in de code; zonder ingestelde variabele blijft een link of adres weg. Tag `pre-rename-clipelle` markeert de staat ervoor.

## Bewust ongewijzigd (en waarom)

| Wat | Waarom |
|---|---|
| Databasetabellen, kolommen en alle bestaande migraties in `drizzle/` | Hernoemen zou een datamigratie zijn; er zit geen merknaam in de tabelnamen. |
| De bestaande lokale storage-bucket `reelay` en de bestaande bestandspaden | De bucketnaam is sinds 22 oktober instelbaar met `STORAGE_BUCKET` (standaard `clipelle` voor een nieuwe installatie; `ensureBucket()` maakt hem aan). De lokale omgeving houdt `STORAGE_BUCKET=reelay` in `.env.local`, zodat de bestaande bestanden en paden in `assets` blijven kloppen. Overstappen = nieuwe bucket, bestanden kopiëren, paden ongewijzigd (de paden bevatten de bucketnaam niet). De openbare bucket `examples` heet gewoon zo. |
| Stripe lookup keys `reelay_<plan>_monthly`, `reelay_<plan>_annual`, `reelay_topup_<usd>` (`src/lib/plans.ts`, `scripts/stripe-setup.ts`, `docs/pricing-model.md`, `docs/stage8-plan.md`) | Lookup keys zijn de koppeling met bestaande Stripe-prijzen; alleen de zichtbare productnamen in `stripe:setup` heten nu "Clipelle …". |
| Lokale map `.reelay/` (`.gitignore`, `scripts/check-secrets.mjs`, documentatie) | Een lokale, niet-getrackte map met oude logs; de ignore-regel blijft zodat die map nooit meegaat. |
| Naam van de git-repository en de lokale map `reelay` | Tijs hernoemt die zelf (GitHub: Settings → Repository name; lokaal `mv`). |
| Terugvalnamen `REELAY_API_KEY` en `REELAY_API_URL` in `mcp/src/index.ts` | Eén release lang gelezen naast `CLIPELLE_API_KEY` en `CLIPELLE_API_URL`, zodat een bestaande MCP-configuratie blijft werken. |
| Cookie `reelay_lang`, `reelay_consent`, `reelay_ws` en localStorage-sleutels `reelay.*` / `reelay:*` | Worden eenmalig gelezen en overgezet naar `clipelle_*` / `clipelle.*` (proxy, `consent.ts`, `workspaces.ts`, inline script in `src/app/layout.tsx`). De oude lezers kunnen na een release weg. |
| Hash-prefix `reelay:` in `src/lib/rateLimit.ts` | Alleen een zout voor gehashte adressen; wijzigen zou lopende limietvensters resetten, zonder enig zichtbaar effect. |
| Bestandsnamen die naar leveranciers gaan (`reelay-<id>.srt`, glossary `reelay-<id>` in `translateWorkflow.ts`) | Wat naar leveranciers wordt gestuurd blijft ongewijzigd (regel van de opdracht); niet zichtbaar voor klanten. |
| Screenshotbestanden `docs/research/screens/reelay-*.jpg` en hun vermelding in `docs/research/layout-research.md` | Historisch onderzoeksmateriaal; de bestandsnamen zijn verwijzingen, geen merktekst. |
| Inngest app-id | Hernoemd naar `clipelle` (nog niet in Inngest Cloud geregistreerd, dus zonder risico); staat hier voor de volledigheid. |

## Wat Tijs later zelf kan hernoemen

- GitHub-repository en lokale map (`reelay` → `clipelle`), daarna het pad in `mcp/README.md` en `/docs/mcp` controleren.
- Storage-bucket: `STORAGE_BUCKET=clipelle` zetten, de objecten van `reelay` naar `clipelle` kopiëren (de paden blijven gelijk) en daarna de oude bucket leegmaken.
- Stripe lookup keys: alleen bij een nieuwe Stripe-account; anders laten staan.
- Na één release: de terugvallezers voor de oude cookies, localStorage-sleutels en `REELAY_*`-variabelen verwijderen.

## Wanneer clipelle.com is gekoppeld

1. **Vercel**: domein `clipelle.com` (en `www`) toevoegen, DNS bij de registrar zetten; `NEXT_PUBLIC_SITE_URL=https://clipelle.com` en `APP_BASE_URL=https://clipelle.com` in de omgevingsvariabelen.
2. **E-mail (Resend)**: domein verifiëren (SPF/DKIM), `EMAIL_FROM=hello@clipelle.com` (de afzendernaam "Clipelle" wordt automatisch toegevoegd), `NEXT_PUBLIC_SUPPORT_EMAIL=support@clipelle.com`, `NOTIFY_EMAIL` naar het adres waar aanvragen binnenkomen.
3. **Supabase Auth**: Site URL `https://clipelle.com`; Redirect URLs `https://clipelle.com/auth/callback` en `https://clipelle.com/auth/callback?next=/reset-password`; e-mailsjablonen tonen "Clipelle".
4. **Stripe**: webhook-endpoint `https://clipelle.com/api/billing/webhook` (nieuwe signing secret in `STRIPE_WEBHOOK_SECRET`); de productnamen via `npm run stripe:setup` (bestaande prijzen blijven, alleen namen).
5. **Inngest Cloud**: app-URL `https://clipelle.com/api/inngest`, sleutels in `INNGEST_EVENT_KEY` en `INNGEST_SIGNING_KEY`.
6. **Leverancierswebhooks**: HeyGen-endpoint opnieuw registreren op `/dev/webhooks` (geheim in `HEYGEN_WEBHOOK_SECRET`); fal.ai en Shotstack volgen `APP_BASE_URL` vanzelf.
7. **Reditus**: programma-URL en volgscript (`NEXT_PUBLIC_REDITUS_SCRIPT_SRC`) op het nieuwe domein; `signupUrl` in `src/content/partners.ts`.
8. **Google OAuth** (alleen als `NEXT_PUBLIC_AUTH_GOOGLE=true`): redirect-URI van de Supabase-callback in de Google-console.
9. **Analytics**: `NEXT_PUBLIC_ANALYTICS_SCRIPT_SRC`/`_SITE_ID` van de provider voor het nieuwe domein.
10. **Controle**: `https://clipelle.com/robots.txt` en `/sitemap.xml` (URL's met het domein, `/nl` met hreflang), `/blog/rss.xml`, Open Graph via een link-preview, favicon in het tabblad.
11. **Korte test**: registreren met een echt adres (verificatiemail van "Clipelle"), inloggen, één gratis advertentie starten, een Stripe-testcheckout, een demo-aanvraag (mail komt aan), de taalvoorkeur na een herlaad.
