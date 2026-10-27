# Van de site gehaalde onderdelen (code bewaard)

Wat op verzoek van Tijs van de site is gehaald, waarom, en hoe het terug kan. De code blijft bestaan, zodat terugzetten één regel is.

## 25 oktober 2026: drie bewegingen van de homepage

| Onderdeel | Waarom weg | Code | Terugzetten |
|---|---|---|---|
| **Lopende feitenbalk** (donkere balk met feiten, "facts ticker") | Er bewogen drie rijen tegelijk (deze balk, de talenmuur en de voorbeeldenrij). De balk herhaalde feiten die elders al staan en maakte de pagina onrustig. | `FactsTicker` in `src/components/site/Persuasion.tsx`; teksten in `home.ticker` (en/nl) | In `src/components/pages/HomePage.tsx` na `<LiveStats />`: `<FactsTicker items={h.ticker} />` en de import weer toevoegen. |
| ~~Advertentie-demo "One form, one click, one finished ad"~~ | **Dezelfde dag teruggezet** op verzoek van Tijs (hij vond hem mooi). Er kwam een vertaaldemo in dezelfde stijl bij (`TranslateDemo`, onder het vertaalvoorbeeld), en de twee kleinere demo's (`AdsDemo`, `UrlDemo`) kregen ook een bewegende muis. | `src/components/site/ProductDemo.tsx` | Staat weer op de homepage, na `<LiveStats />`. |
| **Vervaging bij het inscrollen** (elk blok werd scherp uit een blur) | Bij elk blok oogt dat druk. Een korte fade met een kleine stijging is rustiger. | `@keyframes reveal-in` in `src/app/globals.css` | In de `from`-regel weer `scale(0.985); filter: blur(10px)` toevoegen en in `to` `filter: blur(0)`, met `translateY(22px)` in plaats van `14px`. |

## 25 oktober 2026 (middag): homepage korter, op verzoek van Tijs

| Onderdeel | Wat er gebeurde | Code | Terugzetten |
|---|---|---|---|
| **"Concrete outcomes"**, **"Every choice, on one form"** en **"Built to be trusted"** | Samengevoegd tot één blok met drie tabbladen dat je kunt swipen: "Why Clipelle" (wat je krijgt, wat je kiest, wat we beloven), met scherpere teksten en echte cijfers (gemeten minuten, prijs per minuut op Pro). | Nieuw: `WhyClipelle.tsx`, `SwipeTabs.tsx`, teksten in `home.why`. Oud bewaard: `Outcomes` (HomeSections), `ChoicesChips` (Showcase), `TrustGrid` (Persuasion). | De oude componenten weer in `HomePage.tsx` zetten in plaats van `<WhyClipelle />`. |
| **"Who it is for"** (zes oplossingskaarten) | Weg: "Built for brands that sell online" bovenaan zegt hetzelfde. De oplossingen blijven in het menu. | `UseCaseCards` in `HomeSections.tsx` | `<UseCaseCards locale={locale} />` na het swipe-blok. |
| **"Made with Clipelle"** (voorbeeldenrij) | Voorlopig weg; mag later terug als er schone voorbeelden zijn. | `ExampleMarquee` in `HomeSections.tsx`, teksten `home.examples*` | Het blok met `ExampleMarquee` en de knop "All examples" terugzetten (zie git, commit van 25 okt). |
| **Witte slotkaart "Make your first ad"** op alle pagina's | Vervangen door de donkere slotband van de homepage (`FinalCta`), overal hetzelfde. | `CtaBand.tsx` verwijderd, `cta`-teksten uit de woordenboeken | Uit git halen (`git show HEAD~1:src/components/site/CtaBand.tsx`). |

## 25 oktober 2026 (avond): kale stukken op de andere pagina's, met toestemming van Tijs

| Onderdeel | Wat er gebeurde | Terugzetten |
|---|---|---|
| "Sample coming soon"-tegels | `ExampleGallery` toont alleen echte video's, geen lege tegels meer; zonder video's rendert hij niets. | De placeholder-lus uit git terughalen (`ExampleGallery.tsx`). |
| Voorbeeldengalerij op /platform/ads en /platform/translate | Weg: dezelfde video stond er drie keer. | Het blok met `ExampleGallery kind=…` terugzetten. |
| Donkere middenband (`MidCta`) op de platformpagina's | Weg: onderaan staat nu de donkere slotband. | `<MidCta locale={locale} />` voor `LatestPosts`. |
| Lege vakken in "Real output" | Het invoervak verschijnt alleen met echte inhoud; bij de vertaling staat nu de bronvideo en de gecontroleerde Nederlandse tekst. | — |
| Blok "Facts" op /trust | Weg: herhaalde de kaarten erboven. | Uit git (`TrustBlocks.tsx`). |
| Dubbele "No open roles" (/careers) en "Partner program opens soon" (/partners) | Eén keer laten staan. | — |
| Slack-bot en Ad Launcher | Van de site (pagina's, menu, app-zijbalk). Concept bewaard: `docs/concepts/slack-bot-and-ad-launcher.md`. | Zie dat document. |
| Grijs schetsje bovenaan /platform/url-to-video | Vervangen door de echte advertentie. | — |
| /press | Toegevoegd: feitenblad uit echte waarden en een perskit met de logobestanden. | — |

## 26 oktober 2026: alles in credits, minder herhaling (op verzoek van Tijs)

| Onderdeel | Wat er gebeurde | Terugzetten |
|---|---|---|
| Kleine advertentiedemo met foto (`AdsDemo`) op de homepage | Weg: de grote muis-demo (`ProductDemo`) vertelt hetzelfde en staat nu direct onder de kop "Or make a new ad from a photo or a link"; daaronder alleen de link-rij. | In `HomePage.tsx` de rij `{ key: "ads", … panel: <AdsDemo /> }` terug in `FeatureRows`. |
| Rij live-cijfers (`LiveStats`) | Verborgen zolang er geen enkel echt cijfer boven de drempel is: de vervangende feiten herhaalden de blokken eromheen. Verschijnt vanzelf bij echte cijfers. | In `LiveStats.tsx` de regel `if (!anyLive) return null;` weghalen. |
| "190 talen" zes keer op de homepage | Nog twee keer: de chip in de hero en de talenmuur. Statistiekband, swipe-blok en slotband zeggen nu iets anders. | Teksten in `home.translate.stats`, `home.why.get`, `home.finalPoints`. |

## 26 oktober 2026: prijspagina rustiger, op verzoek van Tijs ("één zo'n dingetje is goed")

| Onderdeel | Wat er gebeurde | Code | Terugzetten |
|---|---|---|---|
| **"What a credit buys"** (tabel credits ≈ dollars per lengte) | Weg van /pricing: drie tabellen met getallen was te druk. Staat nog in het API-tabblad. | `CreditTable` in `PricingTable.tsx` | De sectie met `<CreditTable wide …/>` terugzetten onder de kaarten. |
| **"Find your plan"** (schuifjes + best passende plan) | Vervangen door één eenvoudige rekenhulp **"Which plan fits?"** (`PlanCalculator.tsx`): minuten vertalen, advertenties van 30 s, Premium aan/uit; het antwoord is het kleinste plan of niveau dat het dekt, met de echte prijs. | `PlanFinder.tsx` (bewaard) | `<PlanFinder locale={locale} />` in `PricingTable.tsx`. |
| **"Clipelle vs doing it yourself"** op /pricing | Weg van /pricing; staat nog op de homepage. | `SavingsCalculator.tsx` | Het `Reveal`-blok terug in `PricingPage.tsx`. |
| Minutenkiezer en proefregel per kaart | De drie niveaus zijn nu één keuzemenu in credits; de proefvoorwaarden staan één keer onder de maand/jaar-schakelaar. | — | — |
| Drie vaste creditpakketten op /pricing | Vervangen door een schuifregelaar: elk aantal van 100 tot 10.000 credits (per 50), zelfde prijs per credit. | `CreditsSlider.tsx`, `CUSTOM_CREDITS` in `plans.ts` | — |

Tegelijk is de rekenkern realistischer gemaakt (`planFit`): geen "plan + eenmalig pakket" meer als maandbedrag, en alleen plannen die de gekozen functies hebben (Premium en Precision vanaf Pro).

## 27 oktober 2026: advertenties "Coming soon" (focus op vertalen, op verzoek van Tijs)

Eén schakelaar: `NEXT_PUBLIC_ADS_ENABLED` (`config.features.ads`, standaard uit). Met de schakelaar aan komt alles hieronder vanzelf terug; er is geen code verwijderd.

| Onderdeel | Zonder de schakelaar | Code |
|---|---|---|
| Sidebar, ⌘K, snelle acties | "Ad from a photo" en "Ad from a link" staan onder **Coming soon**; "Brand style" is weg uit de lijst | `src/components/tools.ts` |
| `/new` | Twee grote kaarten (vertalen, vertalen met presentator), de ad-kaarten klein onder "Coming soon" | `WorkflowChooser.tsx` |
| `/new/ad`, `/new/url` | Een uitleg met "Notify me" (`ComingSoonPanel`) en een knop naar vertalen | de twee `page.tsx` |
| Server | `POST /api/projects` (ad), `/api/batches`, `/api/product-page*`, `/api/v1/ads` antwoorden 403 `coming_soon` | `adsEnabledOnly` in `_guard.ts` |
| Dashboard | Geen formats-blok, geen ad-rij in "How it works", vertaaltips, checklist zonder ad-items | `dashboard/*` |
| Projectpagina | Geen "Make another version", "Make variations", "Duplicate"; "Make another" wijst naar vertalen | `ProjectView.tsx`, `ProjectActions.tsx` |
| Settings | "Brand" niet in het menu (vult alleen het ad-formulier) | `SettingsNav.tsx` |
| Site-menu | Image to video en URL to video met "Soon"; solutions alleen e-commerce, agencies, creators (vertaling-first herschreven) | `siteNav.ts`, `solutions.ts`, `solutionsNl.ts` |
| `/platform/ads`, `/platform/url-to-video` | Aankondiging met wachtlijst (`WaitlistForm`, features `ads` en `url-to-video`) | `PlatformAdsPage.tsx`, `PlatformUrlPage.tsx` |
| Homepage | Het ad-blok (`ProductDemo` + link-rij), de ad-chips en de ad-statistiek in "Why Clipelle", de ad-stand van de rekenhulp | `HomePage.tsx`, `WhyClipelle.tsx`, `SavingsCalculator.tsx` |
| Prijzen | Geen ad-tabel, geen ad-schuif, geen ad-rijen in de vergelijking; plan-bullets en FAQ zonder advertenties | `PricingTable.tsx`, `PlanCalculator.tsx`, `plans.ts`, `pricingFaq.ts` |
| Examples, gidsen, FAQ | Alleen vertalingen; ad-gidsen niet in de lijst (pagina's blijven bereikbaar); FAQ-antwoorden vertaling-only (`translateOnly`) | `ExamplesPage.tsx`, `guides.ts`, `faq.ts`, `faqI18n.ts` |
| Beheerde dienst | "Translations, made for you" in plaats van "Winning ads" | `service`/`servicePage` in `en.ts`, `nl.ts` |
| Docs | API- en MCP-docs melden dat `create_ad` 403 geeft | `docs/api`, `docs/mcp` |

Vaste teksten die zonder schakelaar zijn herschreven (blijven zo, ook als ads terugkomen, tenzij Tijs anders wil): `brand.description`, `home.metaDescription`, `builtForText`, `faqPage.metaDescription`, `pricing.text`, de signup-tekst in `AuthShell`.
