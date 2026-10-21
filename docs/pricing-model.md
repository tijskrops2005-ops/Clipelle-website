# Prijsmodel: credits, plannen en marge

Datum: 21 oktober 2026. Bron van alle getallen: `src/lib/plans.ts` (plannen, credits, marges) en `src/lib/pricing.ts` (leverancierskosten). Dit document is uit die code gegenereerd met `npx tsx scripts/pricing-table.ts`; verander getallen alleen in de code en draai het script opnieuw.

## 1. Wat een credit is

**Eén credit = de leverancierskosten van één seconde Standard-advertentie bij de aanbevolen lengte**, inclusief het aandeel script, productclip en montage: een advertentie van 30 s met Standard-presentator kost ons $0,68 (script $0,03, foto aanvullen tot $0,04, productclip $0,26, presentator $0,25, ondertitels en montage $0,10), dus **$0,0227 per credit** (`CREDIT_COST_USD`). Alle andere producten worden met dezelfde schattingen in credits omgerekend (`creditsForUsd = ceil(kosten / 0,0227)`), zodat de klant naast het dollarbedrag één getal ziet dat overal hetzelfde betekent.

| Advertentie | Standard | Premium | Kosten Standard | Kosten Premium |
|---|---|---|---|---|
| 10 s | 20 credits | 38 credits | $0,44 | $0,86 |
| 20 s | 26 credits | 62 credits | $0,57 | $1,40 |
| 30 s | 30 credits | 86 credits | $0,68 | $1,93 |
| 45 s | 38 credits | 121 credits | $0,85 | $2,73 |
| 60 s | 46 credits | 156 credits | $1,03 | $3,53 |

| Vertaling, per minuut bron per taal | Credits | Kosten |
|---|---|---|
| Speed | 98 | $2,21 |
| Precision | 164 | $3,71 |

(Schattingen bij MiniMax Turbo tot 31 oktober; na 1 november stijgt de clip met $0,16 en schuiven de credits mee omdat ze uit dezelfde functie komen.)

## 2. Marge

- Abonnementen: **3×** de leverancierskosten (`SUBSCRIPTION_MARGIN`).
- Losse creditpakketten: **4×** (`TOPUP_MARGIN`).
- Per plan één getal: de prijs staat vast op een rond bedrag en de inbegrepen credits worden daaruit berekend (`includedCreditsFor(prijs) = floor(prijs / (0,0227 × marge) / 10) × 10`), zodat de marge nooit onder het doel zakt.

## 3. Plannen

| Plan | Prijs per maand | Jaarlijks (10 maanden betalen) | Credits per maand | Kosten van die credits | Brutowinst | Marge |
|---|---|---|---|---|---|---|
| Free | $0 | – | 0 (+ één gratis advertentie van 20 credits na verificatie) | $0,44 per gratis advertentie | – | – |
| Starter | $19 | $15,83 | 270 (≈ 9 advertenties van 30 s Standard) | $6,13 | $12,87 | 68% |
| Pro | $59 | $49,17 | 860 (≈ 28) | $19,52 | $39,48 | 67% |
| Scale | $159 | $132,50 | 2.330 (≈ 77) | $52,89 | $106,11 | 67% |
| Enterprise | op maat | – | op maat | – | – | via /demo |

Bij jaarbetaling blijft de marge 3× ten opzichte van de maandprijs minus twee maanden: 10/12 van de prijs voor 12 maanden credits geeft ≈ 2,5× (56%).

## 4. Pakketten (4×)

| Pakket | Prijs | Credits | Kosten | Brutowinst |
|---|---|---|---|---|
| Small | $10 | 110 | $2,50 | $7,50 |
| Medium | $25 | 270 | $6,13 | $18,87 |
| Large | $50 | 550 | $12,49 | $37,51 |

## 5. Regels

- **Geldigheid** (`CREDIT_VALIDITY`): credits uit een abonnement zijn geldig in de maand van toekenning én de maand erna (beperkt overdragen); pakketten 12 maanden; de gratis advertentie 1 maand extra.
- **Gratis eerste advertentie**: één per geverifieerd e-mailadres, alleen 10 s Standard (20 credits), geen creditcard; wereldwijd plafond `FREE_ADS_PER_DAY` (standaard 10) per kalenderdag; daarboven een wachtlijstmelding. Op het Free-plan kan alleen die combinatie starten; vertalingen vragen een plan of pakket.
- **Reserveren en afrekenen**: `startProject` reserveert de credits van de schatting vóór de start; bij voltooiing wordt de reservering afgerekend tegen de werkelijke kosten uit `cost_entries` (teveel komt terug), bij falen volledig teruggeboekt (`src/lib/credits.ts`, hooks in `src/lib/workflow/steps.ts`). De bestaande `reserveSpend`/`settleSpend` zijn ongewijzigd.
- **Kostenbewaking per gebruiker** (nieuw): `MAX_COST_PER_USER_PER_DAY_USD` (standaard 10) en `MAX_COST_PER_USER_PER_MONTH_USD` (standaard 100) bovenop het budget per creatie.

## 6. Wat Tijs in Stripe aanmaakt

Testmodus, met `STRIPE_SECRET_KEY=sk_test_…` in `.env.local`: `npx tsx --env-file=.env.local scripts/stripe-setup.ts` maakt de producten en prijzen met lookup keys `reelay_starter_monthly`, `reelay_starter_annual`, `reelay_pro_monthly`, `reelay_pro_annual`, `reelay_scale_monthly`, `reelay_scale_annual`, `reelay_topup_10`, `reelay_topup_25`, `reelay_topup_50`. Daarna in het Stripe-dashboard een webhook naar `<site>/api/billing/webhook` met de events `checkout.session.completed`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, en de signing secret als `STRIPE_WEBHOOK_SECRET`. Klantportaal aanzetten onder Settings → Billing → Customer portal.

## Labels op de prijzenpagina (21 oktober 2026)

Geen aanbevelingslabel op een plan: "Recommended" op Pro is verwijderd, alle plankaarten zijn gelijkwaardig. Elk label op de pagina moet terug te voeren zijn op code of een regel: "Annual · 2 months free" (tien maanden gerekend, `ANNUAL_MONTHS_CHARGED`), "190 languages" (de taallijst van de vertaaldienst), "Credits valid this month and the next" (`CREDIT_VALIDITY`), "Premium presenter" niet op Free (de free-plan-regel in `startProject`), "Credit packs on top of a paid plan" (checkout weigert een pakket op het gratis plan), "Support: contact form, answered by e-mail" (het contactformulier; er is geen apart supportsysteem, dus geen "priority"). Nieuwe labels alleen met zo'n grondslag.
