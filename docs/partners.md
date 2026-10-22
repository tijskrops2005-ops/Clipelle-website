# Partnerprogramma via Reditus (21 oktober 2026)

Het partnerprogramma loopt via het externe platform Reditus. Clipelle bouwt geen eigen aanmeldformulier, tracking of uitbetaling. Wat wél in de code zit en wat Tijs zelf instelt staat hieronder. Bron: de openbare documentatie van Reditus, gelezen op 21 oktober 2026 (hoofdstuk C in `docs/research/layout-research.md`); geen login, geen formulieren.

## Afgesproken voorwaarden (staan op /partners en in /legal/affiliate-terms)

- 25% commissie op de abonnementsbetalingen van elke doorverwezen klant, levenslang zolang die klant een abonnement houdt.
- Geen commissie op losse creditpakketten.
- Uitbetaling maandelijks, minimum 50 dollar, via Reditus.
- Geen aantal dagen voor een doorverwijsperiode en geen andere bepalingen: die zijn niet opgegeven.

## Wat de code doet

| Onderdeel | Waar | Gedrag |
|---|---|---|
| Volgscript | `src/components/site/ConsentScripts.tsx` | Laadt `NEXT_PUBLIC_REDITUS_SCRIPT_SRC` alleen na cookietoestemming voor "Partner tracking" (Accept all of via Customize). Zonder variabele gebeurt er niets. Reditus adviseert het script niet achter een banner te zetten; wij volgen de eis van Tijs (toestemming eerst), dus bezoekers die weigeren worden niet gevolgd. |
| Aanmeldsignaal | `src/components/site/PartnerSignupConversion.tsx` | Na een geslaagde registratie één keer `window.gr("track","conversion",{ email, uid })` als het script geladen is. Zonder script of toestemming: niets. |
| Stripe-abonnementen | `src/lib/billingCheckout.ts` | De checkout gebruikt de Stripe-klant met het e-mailadres van het account; Reditus koppelt betalingen aan een doorverwijzing op klant-e-mail of klant-id. Er wordt geen `client_reference_id` of referral-metadata meegestuurd (niet gedocumenteerd). |
| Creditpakketten | `scripts/stripe-setup.ts`, `src/lib/billingCheckout.ts` | Product en prijs van elk pakket krijgen `metadata.commissions_disabled = "yes"`; de sessie bevat geen referral-gegevens. Test: `src/lib/billingCheckout.test.ts`. |
| Pagina | `src/app/(site)/partners/page.tsx`, `src/content/partners.ts` | Knop "Join the partner program" verschijnt zodra `signupUrl` is ingevuld; tot dan "Partner program opens soon" met een contactlink. |

## Wat Tijs zelf instelt

1. **Reditus → Settings → Tracking**: kopieer de script-URL van jouw account en zet die als `NEXT_PUBLIC_REDITUS_SCRIPT_SRC` in de omgeving (lokaal `.env.local`, op de server in de hosting). De waarde staat nooit in code.
2. **Reditus → Stripe-koppeling**: verbind het Stripe-account (alleen-lezen). Reditus matcht betalingen op het e-mailadres van de Stripe-klant (dat is bij ons het accountadres) of op `uid` = Stripe customer id. Ons aanmeldsignaal stuurt het accountadres en ons eigen gebruikers-id als `uid`; als Reditus een Stripe customer id als `uid` verwacht, zet dan in Reditus de koppeling op e-mail (standaard).
3. **Uitsluiten van creditpakketten**: draai `npm run stripe:setup` opnieuw na deze wijziging; de pakketproducten en -prijzen krijgen `commissions_disabled = yes`. Controleer in Reditus dat dit metadata-veld wordt gelezen (zie hun documentatie over uitgesloten plannen).
4. **Programma-instellingen in Reditus**: 25% recurring, levenslang, maandelijkse uitbetaling, minimum $50, geen commissie op eenmalige betalingen (de documentatie zegt niet expliciet of eenmalige betalingen standaard meetellen; stel dit in en test met één testdoorverwijzing).
5. **Aanmeldlink**: zet de publieke aanmeldlink van het programma in `src/content/partners.ts` (`signupUrl`).
6. **Partnerlinks**: Reditus gebruikt `?red=<slug>` op onze URL's; het script zet de cookie `gr_id`. Onze site hoeft daar niets voor te doen.

## Open punten

- Of Reditus een terugbetaling als volledige afwijzing van de commissie behandelt staat in hun documentatie (ja); dat is niet in onze voorwaarden opgenomen omdat Tijs dat niet heeft opgegeven.
- Cookie-eerst versus Reditus-advies: bezoekers die partner tracking weigeren, leveren geen commissie op voor de partner. Dat is een bewuste keuze.
