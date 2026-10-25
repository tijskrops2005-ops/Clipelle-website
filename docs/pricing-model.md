# Prijsmodel: credits, plannen en marge

Datum: 21 oktober 2026. Bron van alle getallen: `src/lib/plans.ts` (plannen, credits, marges) en `src/lib/pricing.ts` (leverancierskosten). Dit document is uit die code gegenereerd met `npx tsx scripts/pricing-table.ts`; verander getallen alleen in de code en draai het script opnieuw.

## 0. Wijziging van 24 oktober 2026: volumekorting en goedkoper vertalen

Besluit van Tijs: een groter abonnement moet per video voordeliger zijn, met goede marges, en vertalen klonk te duur. De maandprijzen ($19 / $59 / $159 en Business $249 / $499 / $999) en de Stripe-producten blijven gelijk; alleen het aantal credits per abonnement steeg.

- **Marge per abonnement** (`PLAN_MARGINS` in `src/lib/plans.ts`): Starter 2,75× · Pro 2,5× · Scale 2,25× · Business 249 2,25× · Business 499 2,2× · Business 999 2,15×. Ondergrens voor elk abonnement: **2,15× (≈ 53%)** op de maandprijs (`MIN_SUBSCRIPTION_MARGIN`, getest).
- **Vertalen** kost in credits 80% van de leverancierskosten (`TRANSLATE_CREDIT_FACTOR`); de marge op een vertaling blijft op elk abonnement ≥ 1,7× (`MIN_TRANSLATE_MARGIN`, getest). De afrekening na afloop gebruikt dezelfde regel (`creditsForSpend`), zodat een klant nooit meer betaalt dan het formulier toonde door deze korting.
- Pakketten blijven 4×. Starter dekt nu precies tien advertenties van 30 s (getest).
- Leverancierskosten van vertalen ($2,21 per minuut Speed) maken prijzen onder ± $3,50 per minuut onmogelijk zonder verlies; lager kan alleen met betere inkoopprijzen.

| Vertaling, per minuut bron per taal | Credits (80% van de kosten) | Kosten |
|---|---|---|
| Speed | 78 | $2,21 |
| Precision | 131 | $3,71 |

| Plan | Prijs per maand | Marge (doel) | Credits per maand | Advertenties van 30 s | Prijs per 30-s-advertentie | Vertaalminuut (Speed) | Brutomarge maand | Marge bij jaarbetaling |
|---|---|---|---|---|---|---|---|---|
| Starter | $19 | 2,75× | 300 | 10 | $1,90 | $4,94 | 64% | 2,33× (57%) |
| Pro | $59 | 2,50× | 1.030 | 34 | $1,72 | $4,47 | 60% | 2,10× (52%) |
| Scale | $159 | 2,25× | 3.110 | 103 | $1,53 | $3,99 | 56% | 1,88× (47%) |
| Business 249 | $249 | 2,25× | 4.870 | 162 | $1,53 | $3,99 | 56% | 1,88× (47%) |
| Business 499 | $499 | 2,20× | 9.990 | 333 | $1,50 | $3,90 | 55% | 1,83× (45%) |
| Business 999 | $999 | 2,15× | 20.460 | 682 | $1,46 | $3,81 | 54% | 1,79× (44%) |

## 1. Wat een credit is

**Eén credit = de leverancierskosten van één seconde Standard-advertentie bij de aanbevolen lengte**, inclusief het aandeel script, productclip en montage: een advertentie van 30 s met Standard-presentator kost ons $0,68 (script $0,03, foto aanvullen tot $0,04, productclip $0,26, presentator $0,25, ondertitels en montage $0,10), dus **$0,0227 per credit** (`CREDIT_COST_USD`). Alle andere producten worden met dezelfde schattingen in credits omgerekend (`creditsForUsd = ceil(kosten / 0,0227)`), zodat de klant naast het dollarbedrag één getal ziet dat overal hetzelfde betekent.

| Advertentie | Standard | Premium | Kosten Standard | Kosten Premium |
|---|---|---|---|---|
| 10 s | 20 credits | 38 credits | $0,44 | $0,86 |
| 20 s | 26 credits | 62 credits | $0,57 | $1,40 |
| 30 s | 30 credits | 86 credits | $0,68 | $1,93 |
| 45 s | 38 credits | 121 credits | $0,85 | $2,73 |
| 60 s | 46 credits | 156 credits | $1,03 | $3,53 |

(Vervangen op 24 oktober 2026, zie §0: Speed 78 credits, Precision 131 credits per minuut.)

(Schattingen bij MiniMax Turbo tot 31 oktober; na 1 november stijgt de clip met $0,16 en schuiven de credits mee omdat ze uit dezelfde functie komen.)

## 2. Marge

- Abonnementen: **3×** de leverancierskosten (`SUBSCRIPTION_MARGIN`).
- Losse creditpakketten: **4×** (`TOPUP_MARGIN`).
- Per plan één getal: de prijs staat vast op een rond bedrag en de inbegrepen credits worden daaruit berekend (`includedCreditsFor(prijs) = floor(prijs / (0,0227 × marge) / 10) × 10`), zodat de marge nooit onder het doel zakt.

## 3. Plannen (situatie 21 oktober 2026, vervangen door §0)

| Plan | Prijs per maand | Jaarlijks (10 maanden betalen) | Credits per maand | Kosten van die credits | Brutowinst | Marge |
|---|---|---|---|---|---|---|
| Free | $0 | – | 0 (+ één gratis advertentie van 20 credits na verificatie) | $0,44 per gratis advertentie | – | – |
| Starter | $19 | $15,83 | 270 (≈ 9 advertenties van 30 s Standard) | $6,13 | $12,87 | 68% |
| Pro | $59 | $49,17 | 860 (≈ 28) | $19,52 | $39,48 | 67% |
| Scale | $159 | $132,50 | 2.330 (≈ 77) | $52,89 | $106,11 | 67% |
| Enterprise | op maat | – | op maat | – | – | via /demo |

Bij jaarbetaling blijft de marge 3× ten opzichte van de maandprijs minus twee maanden: 10/12 van de prijs voor 12 maanden credits geeft ≈ 2,5× (56%).

### 3b. Business-plannen voor teams (21 oktober 2026, credits vervangen door §0)

Zelfde marge (3×) en dezelfde formule als de individuele plannen; het verschil is de teamwerkruimte (leden met eigen login, één gedeelde creditpot, verbruik per lid voor de eigenaar, API-sleutels per werkruimte). Geen kosten per gebruiker.

| Niveau | Prijs per maand | Jaarlijks (10 maanden betalen) | Credits per maand |
|---|---|---|---|
| Business 249 | $249 | $207,50 | 3.650 (≈ 121 advertenties van 30 s Standard) |
| Business 499 | $499 | $415,83 | 7.320 (≈ 244) |
| Business 999 | $999 | $832,50 | 14.660 (≈ 488) |

De drie niveaus staan in `BUSINESS_TIERS` (`src/lib/plans.ts`, `isTeamPlan`); uitnodigingen van teamleden werken alleen op een Business-plan. Enterprise blijft "Let's talk" via `/demo`.

## 4. Pakketten (4×)

| Pakket | Prijs | Credits | Kosten | Brutowinst |
|---|---|---|---|---|
| Small | $10 | 110 | $2,50 | $7,50 |
| Medium | $25 | 270 | $6,13 | $18,87 |
| Large | $50 | 550 | $12,49 | $37,51 |

### 4b. Batch-variaties (21 oktober 2026)

Een batch van 2–5 varianten kost precies N × de schatting van één advertentie bij dezelfde lengte en kwaliteit; er is geen korting en geen opslag. Elke variant reserveert zijn eigen credits (bestaande grootboekregels), de balans wordt vooraf op het totaal gecontroleerd, het budget per creatie (`MAX_COST_PER_CREATIVE_USD`) geldt per variant, en de limieten per gebruiker per dag en maand gelden voor het totaal. Een mislukte variant betaalt alleen zichzelf terug. Niet beschikbaar op het gratis plan.

## 5. Regels

- **Geldigheid** (`CREDIT_EXPIRY`, besluit 21 oktober 2026): betaalde credits (abonnementen en pakketten) **vervallen nooit** zolang het account bestaat, ook niet na opzeggen van het abonnement; bij verwijderen van het account vervallen ze. De gratis eerste advertentie vervalt 30 dagen na toekenning. De marge per plan gaat uit van volledig gebruik van alle credits (`planMargin` rekent de kosten van álle inbegrepen credits), dus ongebruikte credits zijn nooit als omzet geteld; de marges in §3 en §4 veranderen hierdoor niet: Starter 68%, Pro 67%, Scale 67% (alle ≥ 3×), pakketten 4× (110 × $0,0227 × 4 = $9,99 ≤ $10; 270 → $24,52 ≤ $25; 550 → $49,94 ≤ $50). Geen plan zakt onder de marge; geen prijs hoeft te veranderen. Kanttekening: credits die jaren later worden gebruikt kosten dan de leverancierstarieven van dat moment; de marge is berekend op de tarieven van vandaag.
- **Gratis eerste advertentie**: één per geverifieerd e-mailadres, alleen 10 s Standard (20 credits), geen creditcard; wereldwijd plafond `FREE_ADS_PER_DAY` (standaard 10) per kalenderdag; daarboven een wachtlijstmelding. Op het Free-plan kan alleen die combinatie starten; vertalingen vragen een plan of pakket.
- **Reserveren en afrekenen**: `startProject` reserveert de credits van de schatting vóór de start; bij voltooiing wordt de reservering afgerekend tegen de werkelijke kosten uit `cost_entries` (teveel komt terug), bij falen volledig teruggeboekt (`src/lib/credits.ts`, hooks in `src/lib/workflow/steps.ts`). De bestaande `reserveSpend`/`settleSpend` zijn ongewijzigd.
- **Kostenbewaking per gebruiker** (nieuw): `MAX_COST_PER_USER_PER_DAY_USD` (standaard 10) en `MAX_COST_PER_USER_PER_MONTH_USD` (standaard 100) bovenop het budget per creatie.

## 6. Wat Tijs in Stripe aanmaakt

Testmodus, met `STRIPE_SECRET_KEY=sk_test_…` in `.env.local`: `npx tsx --env-file=.env.local scripts/stripe-setup.ts` maakt de producten en prijzen met lookup keys `reelay_starter_monthly`, `reelay_starter_annual`, `reelay_pro_monthly`, `reelay_pro_annual`, `reelay_scale_monthly`, `reelay_scale_annual`, `reelay_topup_10`, `reelay_topup_25`, `reelay_topup_50`. Daarna in het Stripe-dashboard een webhook naar `<site>/api/billing/webhook` met de events `checkout.session.completed`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, en de signing secret als `STRIPE_WEBHOOK_SECRET`. Klantportaal aanzetten onder Settings → Billing → Customer portal.

## Labels op de prijzenpagina (21 oktober 2026)

Eén aanbevelingslabel: "Our recommendation" op Pro, gestuurd door `recommended: true` in `plans.ts` (teruggezet bij de herbouw van de prijzenpagina; eerder die dag verwijderd). Een lanceerprijs (`listPrice`) mag alleen een echte eerdere prijs met einddatum zijn en is standaard leeg. Elk label op de pagina moet terug te voeren zijn op code of een regel: "Annual · 2 months free" (tien maanden gerekend, `ANNUAL_MONTHS_CHARGED`), "190 languages" (de taallijst van de vertaaldienst), "Credits never expire" (`CREDIT_EXPIRY`), "Use it within 30 days" voor de gratis advertentie, "Premium presenter" niet op Free (de free-plan-regel in `startProject`), "Credit packs on top of a paid plan" (checkout weigert een pakket op het gratis plan), "Support: contact form, answered by e-mail" (het contactformulier; er is geen apart supportsysteem, dus geen "priority"). Nieuwe labels alleen met zo'n grondslag.
