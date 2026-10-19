# Prijs en kwaliteit per stap

Peildatum: 19 oktober 2026. Alle prijzen zijn de gepubliceerde lijstprijzen van de leveranciers op die dag (bronnen per onderdeel). Rekenbasis: één video van 30 seconden. Shotstack telt overal als $0,10 per video, ook als de sandbox gratis rendert. HeyGen-tarieven zijn de enterprise-tarieven (1 credit = $0,50); de self-serve tabel staat achter een login en het helpcenter noemt ongeveer $4 per minuut voor 1080p, dus de presentator kan in de praktijk iets duurder uitvallen (zie §8).

**Status: analyse en voorstel. Er is niets gebouwd; de standaardinstellingen in `src/lib/workflow/settings.ts` veranderen pas na akkoord.**

## 1. Script (Claude)

| Model | Invoer / uitvoer per miljoen tokens | Kosten per script (≈1.500 in, 900 uit) | Kosten per herschrijving in advertentietoon |
|---|---|---|---|
| Claude Opus 5.5 | $4 / $20 | $0,024 | $0,02 |
| Claude Sonnet 5.5 | $2 / $10 | $0,012 | $0,01 |
| Claude Haiku 5.5 | $0,10 / $0,50 | $0,001 | $0,001 |

Bron: https://platform.claude.com/docs/en/about-claude/pricing

**Keuze: Opus 5.5 voor het script, Sonnet 5.5 voor de herschrijving.** De hook en het script bepalen of de advertentie werkt; het prijsverschil tussen Opus en Sonnet is één cent per video, dus hier bezuinigen levert niets op. De herschrijving van ondertitels is een strak begrensde taak (zelfde aantal fragmenten, tekenlimiet) waar Sonnet goed genoeg is en sneller antwoordt. Haiku is te wisselvallig voor marketingtekst.

## 2. Productclip (fal.ai, 5 seconden)

| Model | Resolutie | Per seconde nu | Per clip van 5 s nu | Na 1 november |
|---|---|---|---|---|
| MiniMax H3 Max | 768p | $0,052 (promo) | $0,26 | $0,40 |
| MiniMax H3 Max | 1080p | $0,104 (promo) | $0,52 | $0,80 |
| MiniMax H3 Max Turbo | 768p | $0,026 (promo) | $0,13 | $0,20 |
| MiniMax H3 Max Turbo | 1080p | $0,052 (promo) | $0,26 | $0,40 |
| Kling v3 Standard (audio uit) | tot 1080p | $0,084 | $0,42 | $0,42 |
| Kling v3 Pro (audio uit) | tot 1080p | $0,112 | $0,56 | $0,56 |
| Seedance 1.5 Pro | 1080p | per token | ≈ $0,25 | ≈ $0,25 |

Bronnen: https://fal.ai/models/minimax/h3-max/image-to-video, https://fal.ai/models/minimax/h3-max-turbo/image-to-video, https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video, https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video, https://fal.ai/pricing

Wat telt bij een productclip: het product moet exact blijven zoals op de foto (logo, kleur, vorm), de beweging moet rustig zijn, en de uitvoer moet scherp zijn op een telefoonscherm van 1080×1920. Een 768p-clip wordt door Shotstack opgeschaald naar 1080p en oogt daardoor zachter dan de presentator ernaast.

**Keuze: Kling v3 Standard als standaard vanaf 1 november; tot die datum MiniMax H3 Max Turbo op 1080p.** Kling staat bekend om het vasthouden van productdetails en levert 1080p voor $0,42, wat na de promo nagenoeg gelijk is aan MiniMax op 1080p-turbo ($0,40) en goedkoper dan MiniMax H3 Max 1080p ($0,80). Tot 31 oktober is Turbo op 1080p ($0,26) de beste koop, mits de vergelijkingstest (§9) bevestigt dat Turbo het product even trouw weergeeft als H3 Max. Kling Pro ($0,56) is de duurste optie zonder zichtbaar voordeel voor een stilstaand product; Seedance is goedkoop maar moet eerst bewijzen dat het logo's niet vervormt. Let op: de code kent nu `minimax` (H3 Max 768p) en `kling` (Pro); de Turbo- en Standard-varianten komen er bij na akkoord.

## 3. Foto aanvullen (Bria Expand)

$0,04 per foto. Alleen nodig als het product niet in een 9:16-uitsnede past; de analyse beslist dat automatisch. **Keuze: laten zoals het is.** Het alternatief (de hele foto opnieuw laten genereren) verandert het product en is daarmee geen optie.

## 4. Presentator (HeyGen)

| Engine | Per seconde | 13,5 s spreektijd (45% van 30 s) | Kwaliteit |
|---|---|---|---|
| Avatar III (studio/digital twin) | $0,0084 | $0,11 | Oudere engine: stijvere beweging, minder natuurlijke mimiek |
| Avatar III (photo avatar) | $0,0217 | $0,29 | Zelfde engine op een foto-avatar |
| Avatar IV (alle avatartypes) | $0,05 | $0,68 | Huidige standaard: natuurlijke hoofd- en handbeweging, goede lipsync |
| Avatar V | $0,05 | $0,68 | Alleen voor eigen digital twins (opname van jezelf of een acteur) |

Geen toeslag voor 1080p in de API-tarieven; 1080p is dus de keuze. Bron: https://developers.heygen.com/docs/enterprise-pricing

**Keuze: Avatar IV op 1080p.** Dit is de stap die de klant het eerst ziet en beoordeelt. Avatar III bespaart $0,57 per video maar oogt als een jaar oud; voor een advertentie waar iemand voor betaalt is dat het verschil tussen "wauw" en "AI". Avatar V is pas interessant zodra we eigen presentators opnemen.

## 5. Montage (Shotstack)

| Plan | Prijs | Minuten | Per video van 30 s | Omslagpunt |
|---|---|---|---|---|
| Pay-as-you-go | $10 per 50 min | 50 | $0,10 | tot ≈ 100 video's per maand |
| Starter | $39 per maand | 250 | $0,078 | vanaf ≈ 100 video's per maand |
| Pro | $99 per maand | meer minuten en hogere limieten | lager | pas bij honderden video's |

Bron: https://shotstack.io/pricing/

**Keuze: pay-as-you-go, in alle berekeningen $0,10 per video.** Pas bij meer dan honderd video's per maand loont Starter, en dan nog maar twee cent per video. De kwaliteit is op alle plannen gelijk.

## 6. Vertaling (HeyGen Video Translation)

| Modus | Per seconde bron | 30 s | Wat je krijgt |
|---|---|---|---|
| Speed | $0,025 | $0,75 | Gekloonde stem, standaard lipsync; goed bij een spreker op normale afstand |
| Precision | $0,05 | $1,50 | De mond wordt opnieuw getekend; nodig bij close-ups en grote schermen |
| Proofread (per taal) | $0,0042 | $0,125 | Vertaalde ondertitels corrigeerbaar vóór de render |

**Keuze: speed als standaard, precision als optie voor close-ups.** Speed geeft bij een presentator die op borsthoogte in beeld staat een resultaat dat kijkers op een telefoon niet als vertaald herkennen. Precision verdubbelt de kosten en past niet in het budget van $1,50 per taalversie (zie §7); het blijft beschikbaar als de klant het aanvinkt en het budget wordt verhoogd.

## 7. Beeldverbetering (fal.ai)

| Model | Per seconde | 30 s | Wanneer |
|---|---|---|---|
| Topaz Proteus (tot 1080p) | $0,02 | $0,60 | Bronvideo onder 1080p of met compressieschade |
| Topaz (boven 1080p) | $0,08 | $2,40 | Nooit voor social; past niet in een budget |
| FlashVSR | $0,0005 per megapixel-frame | ≈ $0,75 | Snelle opschaling, minder detailherstel |
| SeedVR2 | $0,001 per megapixel-frame | ≈ $1,50 | Hoogste kwaliteit, te duur voor standaard |

Bron: https://fal.ai/models/fal-ai/topaz/upscale/video

**Keuze: Topaz Proteus, standaard uit.** Bij een goede bronvideo (1080p, telefoon van de laatste jaren) voegt het niets toe. Bij oud of gecomprimeerd materiaal is het de enige stap die zichtbaar verschil maakt. Daarom een vinkje, geen standaard.

## 8. Kosten per video van 30 seconden

### Workflow A (advertentie vanaf productfoto)

| Onderdeel | Tot 31 oktober | Vanaf 1 november |
|---|---|---|
| Script (Opus 5.5) | $0,02 | $0,02 |
| Foto aanvullen (alleen indien nodig) | tot $0,04 | tot $0,04 |
| Productclip 5 s (nu MiniMax Turbo 1080p, straks Kling Standard) | $0,26 | $0,42 |
| Presentator Avatar IV, 13,5 s | $0,68 | $0,68 |
| Montage, ondertitels, muziek, CTA (Shotstack) | $0,10 | $0,10 |
| **Totaal** | **$1,06 tot $1,10** | **$1,22 tot $1,26** |

Zou HeyGen self-serve $4 per minuut rekenen in plaats van $3, dan wordt de presentator $0,90 en het totaal $1,28 tot $1,48. Nog binnen $1,50, zonder marge. Met Avatar III zou het totaal $0,65 zijn, maar dat is de bezuiniging die de klant ziet.

### Workflow B (bestaande video vertalen), per taalversie

| Onderdeel | Speed | Speed + verbetering | Precision | Precision + verbetering |
|---|---|---|---|---|
| Proofread (eigen taal) | $0,125 | $0,125 | $0,125 | $0,125 |
| Transcript brontaal, gedeeld (bij 1 taal volledig, bij 2 talen de helft) | $0,06 tot $0,125 | $0,06 tot $0,125 | $0,06 tot $0,125 | $0,06 tot $0,125 |
| Herschrijving (Sonnet 5.5) | $0,01 | $0,01 | $0,01 | $0,01 |
| Render | $0,75 | $0,75 | $1,50 | $1,50 |
| Beeldverbetering | – | $0,60 | – | $0,60 |
| Ondertitels en formaat (Shotstack) | $0,10 | $0,10 | $0,10 | $0,10 |
| **Totaal per taal** | **$1,05 tot $1,11** | **$1,65 tot $1,71** | **$1,80 tot $1,86** | **$2,40 tot $2,46** |

Een tweede taal kost dus ongeveer $1,05 extra (speed). De prijsverhoging van 1 november raakt Workflow B niet.

## 9. Past een goede advertentie binnen $1,50 per klik?

**Workflow A: ja.** Met Avatar IV op 1080p, een productclip van 5 seconden op 1080p en de volledige montage kom je op $1,06 nu en $1,26 na 1 november. Wat je ervoor inlevert: één productclip in plaats van twee (een tweede clip van 5 s kost $0,26 tot $0,42 extra en brengt het totaal op $1,32 tot $1,68), en de presentator spreekt maximaal zo'n 14 seconden. Bij $2,00 passen twee productclips (meer afwisseling in de B-roll) of Kling Pro, en blijft er ruimte voor de onzekerheid in het HeyGen-tarief. Mijn advies: $1,50 houden als standaard en $2,00 niet nodig maken, maar wel toestaan als een klant twee clips wil.

**Workflow B: ja in speed-modus, nee zodra je precision of beeldverbetering wilt.** Speed zonder verbetering kost $1,05 tot $1,11 per taal. Precision ($1,80 tot $1,86) en speed met verbetering ($1,65 tot $1,71) vallen buiten $1,50. Met $2,00 past óf precision óf speed met verbetering, niet allebei ($2,40 tot $2,46). Wat je inlevert bij $1,50: bij close-ups is de lipsync van speed zichtbaar minder, en oude bronvideo's blijven zacht. Advies: $1,50 voor speed als standaard, en de twee opties in het formulier expliciet tonen met hun meerprijs, zodat het budget per taal in de instellingen naar $2,00 kan voor klanten die dat willen.

## 10. Vergelijking met MakeUGC en Creatify

| Aanbieder | Plan | Prijs | Wat je krijgt | Prijs per video van 30 s |
|---|---|---|---|---|
| Creatify | Standard | $15 per maand | 55 credits; 15 s avatar-video = 5 credits | ≈ $2,73 (10 credits per 30 s) |
| Creatify | Pro | $55 per maand | 280 credits | ≈ $1,96 |
| Creatify | Max | $95 per maand | 730 credits | ≈ $1,30 |
| Creatify | API Starter | $99 per maand | 500 API-credits | ≈ $1,98 |
| MakeUGC | Starter | $29 per maand | 500 credits, 480p/720p | niet afleidbaar: credits per video staan niet op de prijspagina |
| MakeUGC | Growth | $39 per maand | 1.000 credits, HD tot 4K | idem |
| MakeUGC | Pro | $79 per maand | 2.000 tot 5.000 credits | idem |

Bronnen: https://creatify.ai/pricing, https://www.makeugc.ai/pricing (credits per video bij MakeUGC alleen zichtbaar in de app).

Wat dit zegt over marge: de markt betaalt tussen $1,30 en $2,75 per video van 30 seconden bij een abonnement, en Creatify rekent bovendien door bij hogere resolutie en premium modellen. Onze kale kosten zijn $1,06 tot $1,26 voor A en $1,05 tot $1,11 per taal voor B. Op een abonnement van bijvoorbeeld $49 per maand voor 20 video's ($2,45 per video) blijft $1,20 tot $1,40 per video over, ongeveer 50% brutomarge; bij $79 voor 30 video's ($2,63 per video) ruim 50%. Onder $2,00 per video is de marge te dun zodra HeyGen self-serve duurder blijkt. Het verkoopargument tegenover beide concurrenten is niet de prijs maar de combinatie: vertaling met behoud van de spreker, de montage met hook, ondertitels en CTA in één klik, en de correctiestap.

## 11. Vergelijkingstest met een echt product (maximaal $5)

Alles via de bestaande testpagina's, met de cost guard aan (per actie $1,50), met één productfoto en één bestaande video van 20 seconden van jou.

| # | Pagina | Wat | Kosten |
|---|---|---|---|
| 1 | `/dev/script` | Script met Opus 5.5 en met Sonnet 5.5 van dezelfde productbeschrijving | $0,04 |
| 2 | `/dev/product-clip` | Dezelfde 9:16-foto door MiniMax H3 Max 768p, MiniMax H3 Max Turbo 1080p en Kling v3 Standard | $0,26 + $0,26 + $0,42 = $0,94 |
| 3 | `/dev/heygen` | Hetzelfde script van 10 seconden met Avatar III en Avatar IV, 1080p | $0,08 + $0,50 = $0,58 |
| 4 | `/dev/translate` | Je video van 20 s naar Duits in speed (proofread + transcript + render) | $0,08 + $0,08 + $0,50 = $0,66 |
| 5 | `/dev/translate` | Dezelfde video naar Duits in precision | $0,08 + $1,00 = $1,08 |
| 6 | `/dev/translate` | Beeldverbetering met Topaz op de speed-versie | $0,40 |
| 7 | `/dev/final-edit` | Montage van de beste clip en presentator, sandbox | $0 |
| | | **Totaal** | **≈ $3,70** |

Beoordeel per paar op drie vragen: zou ik dit als advertentie durven inzetten, is het product herkenbaar en onvervormd, en zie ik dat het AI is. Noteer per test de werkelijke kosten uit de spend meter naast de schatting; die vergelijking zegt ook meteen of HeyGen self-serve $3 of $4 per minuut rekent.

Voor stap 2 moeten de Turbo- en Standard-varianten eerst als keuze op de testpagina komen (klein werk, zonder betaalde aanroep); dat doe ik samen met het doorvoeren van de standaardinstellingen zodra je akkoord geeft.

## 12. Voorgestelde standaardinstellingen (na akkoord)

| Instelling | Nu | Voorstel |
|---|---|---|
| Scriptmodel | Opus 5.5 | Opus 5.5 (ongewijzigd) |
| Herschrijfmodel | Opus 5.5 | Sonnet 5.5 |
| Productclip | MiniMax H3 Max 768p | tot 31 oktober MiniMax H3 Max Turbo 1080p; vanaf 1 november Kling v3 Standard |
| Presentator | Avatar IV, 720p | Avatar IV, 1080p |
| Montage | Shotstack sandbox (test) | Shotstack pay-as-you-go bij lancering, $0,10 per video in alle schattingen |
| Vertaling | speed | speed (precision als optie) |
| Beeldverbetering | uit | uit (Topaz Proteus als optie) |
| Budget per creative | $1,50 | $1,50; per taalversie in Workflow B; het formulier toont de meerprijs van precision en verbetering |
