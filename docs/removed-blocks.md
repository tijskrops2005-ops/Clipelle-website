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

## 28 oktober 2026: "Why Clipelle" opnieuw opgebouwd (op verzoek van Tijs)

De drie tabbladen (What you get / What you decide / What we promise) met swipe zijn vervangen door één blok zonder tabs: een donkere prijskaart (prijs per vertaalde minuut op Pro), vier kleine feiten (0 reshoots, credits vervallen nooit, 30 gratis credits, 9:16), de beloftes als één rustige lijst en de keuzes op het formulier als één rij chips. "Credits never expire" stond eerst twee keer; "credits en dollars" klopte niet meer (klanten zien alleen credits). Het swipe-onderdeel `SwipeTabs.tsx` bestaat nog in de code. Terugzetten: de vorige versie van `WhyClipelle.tsx` en `home.why` in `en.ts`/`nl.ts` staat in git vóór commit van 28 okt 2026 ("Why Clipelle as one bento").

## 28 Oct 2026: /trust cleaned up (Tijs: "nog steeds veel test dingen")

- **Example trust layout** (logos "Example brand", "0 example number", example reviews, "As seen in") is no longer shown in development or demo mode either. To judge the design, start the dev server with `NEXT_PUBLIC_TRUST_PREVIEW=true`. Real content still comes only from `src/content/trust.ts`.
- **Trust fact "Your own products and photos" / "Je eigen producten en foto's"** removed from `trust.facts` in both dictionaries while ads are off. Restore when `NEXT_PUBLIC_ADS_ENABLED=true`: "Image to video and URL to video ask you to use only products and photos you own or have the rights to use. Photos read from a product page are copied only after you confirm them."
- Site copy no longer says "credits and dollars": customers see credits only (trust, home outcomes, solutions, the ad guide and six blog posts).

## 31 Oct 2026: dashboard with one job (product polish, `docs/plan-product-polish.md` #3)

Off the dashboard, code kept in `src/components/dashboard/`: the three stat cards with the ring and the seven-day bars (the old `Overview`; the new one is one line with the balance, what it buys, the plan and this month's count; the old version is in git before this commit), the **Activity** feed (`ActivityFeed.tsx`), the **Tip of the day** (`TipCard.tsx`), and the quick-actions card (now one row of pills). **How it works** shows only for an account without projects (`WhenNoProjects.tsx`). Restore: import the component again in `src/app/(app)/dashboard/page.tsx` and place it in the right column.

## 23 Nov 2026: one coherent site and app (consistency round after Noah's review; `docs/build-progress.md`)

Off the screens, code kept:

- **Hero fan illustrations** (`AdSketch` tiles with hook text in `HeroShowcase`, `src/components/site/Showcase.tsx`): the fan shows real videos only (each sample's translation and its original). The drawn tiles promised text cards the product never puts on screen. `AdSketch` and the `showcaseWords` dictionary entries stay for the ads flag.
- **Tilted illustration cards behind the platform-page phone** (`HeroStage` with `plain`): they were cut off mid-word. Pass `plain={false}` (the default elsewhere) to bring them back.
- **"Translated videos" grid on /examples** (`ExampleGallery kind="translate"`): every translation sample sits in the before-and-after block (`BeforeAfter`), a sample without its original alone in the same frame. The grid used the browser's own players and repeated the same videos.
- **The "Done for you" button in the dark band on /pricing** (`EnterpriseBand`): the managed service has its own block right below; the band keeps one action.
- **The "Credits never expire" line under every plan card on /pricing**: said once in the page intro ("Credits you pay for never expire") and on the Free card as the 30-day rule.
- **The "Case studies" menu and footer link**: shows again as soon as `src/content/case-studies.ts` has a published story (`HAS_STORIES` in `siteNav.ts`).
- **The homepage showcase's second red button**: "Translate a video" under the language wall is black now; the hero button is the page's one accent.

Changed numbers, for the record: the site quotes **7 minutes for a 30-second video** (`measured.translationMinutes`, the median of five live runs on 2 Nov 2026) instead of 4.5 minutes for one 8-second run; the one short run is kept as `measured.shortTranslationMinutes`.

## 23 Nov 2026: clarity round (Tijs: "te veel tekst, te AI-achtig"; rules in `docs/design-clarity.md`)

Off the screens, code kept unless said otherwise:

**Homepage and site core**
- Hero proof chips (`ProofChips`, `home.proof`): mount `<ProofChips items={h.proof} />` under the small print to bring them back.
- "Built for brands that sell online" chips and "Made for TikTok / Reels / Shorts" (`BuiltFor` in `Persuasion.tsx`): mount `<BuiltFor locale={locale} />` after `TranslateDemo` in `HomePage.tsx`.
- "Why Clipelle": the "What we promise" list and the "On the form you pick" chips (`home.why.promise*`, `decide*` keys kept; markup in git before commit `de83ce7`); the "0 reshoots" fact.
- Stats band: the "1 upload" fact (`home.translate.stats`).
- Closing band: glow fields, the falling language codes and the three check lines (`home.finalPoints` kept).
- Showcase: the secondary "How translation works" button (`home.translate.how` kept). Translate demo: its sentence (`home.translateDemo.text` is empty now).
- Managed-service block on /pricing: the volume and turnaround facts, the feature list and the second button (content stays in `src/content/services.ts` and on /services/done-for-you).
- Homepage plan cards: the plan icons and the "Extra credit packs" row (`pricingPreview.packs` kept).
- Every mono eyebrow above a heading (`SectionIntro` ignores the prop) and every scroll-reveal entrance (`Reveal` is static; `.reveal` keyframes stay in `globals.css`).

**App shell, dashboard, settings**
- Dashboard: the quick-action pill row (`dashboard/QuickActions.tsx` kept, not mounted), the header "Create new video" button, the credit-rule line and the "N running" count in the credit strip, the checklist item descriptions.
- Settings: the `DemoBadge` pills on Profile, Usage, Billing, Brand, API keys, Webhooks and Team (one quiet demo line per page instead); the "Switched off" badge under Payments; the icon circles and "Coming soon" badges on the Connections cards.
- Projects: the mono kind pill under each tile (an icon with a tooltip now).

**Creation flow, progress and result pages**
- Translation result page: the "Translate another" header button (the sidebar has it); the description lines under "Your videos", "Quality check" and "Versions".
- Ad pipeline: the mono connector captions ("The script feeds steps 2 and 3"), the step-card description paragraphs.
- The "Recommended" badges on the quality and presenter-quality cards; the Demo badges on the result sections, the edit screen, the presenter and voice pickers.
- The helper sentences under form fields that repeated the label (both translate flows, the chooser, the edit screen).

**Company, resource, docs, blog, legal and sign-in pages (lane D of the clarity round; restore from the diff `ff11ef9..b013500` of the named file)**
- Partners: the benefit cards and the "Opens soon" badge card (`CompanyPages.tsx`; `partners.benefits*` keys kept). Careers: the value cards (`careers.values` kept). About: the value cards are a plain list. Trust: the icon cards are a `FactList`. Press: pillars and audiences show only with `config.features.ads`; the brand-info card merged into the fact table. Customers: the icon card.
- Blog: the subtitle, the tag cloud, the article summary and tag row; related articles are a list; cards lost category and summary (`BlogIndex.tsx`, `BlogCard.tsx`, `blog/[slug]/page.tsx`).
- Legal: the eyebrow and the draft badge (`LegalPage.tsx`). Sign-in: the glow fields and the `.rise` entrance (`AuthShell.tsx`).
- Forms (demo, careers, services): the card chrome, the help lines and the success icon circle. Resources hub: the `MenuCard` icons. Solutions: the problem block and the example badge; the FAQ is three questions. Coming-soon pages: the does/does-not lists. Docs: the eyebrow labels. Services: the fact cards are a plain list.
- Every trailing arrow icon in these components.

## 24 Nov 2026: route audit and coming-soon cleanup (`docs/route-audit.md`)

- **Publish to TikTok / Reels / Shorts and Import from Shopify**: gone from the sidebar, the tool search and Settings (the `PUBLISH_TOOLS` list in `src/components/tools.ts` and `ConnectionsSettings.tsx` were deleted; `src/app/api/settings/notify` still accepts the old feature keys, so stored wishes stay valid). To announce one again, add a `Tool` with `soon: true` to `SOON_TOOLS` and a page that explains it.
- **Settings → Connections**: menu entry and page removed; `/settings/connections` redirects to `/settings` (`next.config.ts`).
- **MCP in the menus**: `/integrations/mcp` and `/docs/mcp` left the Platform and Resources menus and the footer (the server is not published as a package); the pages stay, the API docs link to them, the sitemap lists them. Put the two items back in `siteNav.ts` when `@clipelle/mcp` is on npm.
- **Partner program** moved from Resources to Company. **/customers** left the sitemap until the first story (the page itself is an honest empty state).
- New redirects for bare section URLs: `/mcp`, `/docs`, `/solutions`, `/integrations`, `/company`, `/creations`, `GET /api` (and the `/nl` twins).

## 24 Nov 2026: dashboard, hero, calculator, company menu (Tijs)

- **Dashboard**: the one-line credit strip (`Overview.tsx`) and the big 9:16 tiles under "Recent projects" (`RecentProjects.tsx`) are replaced by four stat cards and a list; both components stay in `src/components/dashboard/`.
- **Hero**: the lounge-chair sample (no original) left the fan; it is on /examples.
- **Calculator**: the Speed/Precision switch, the "Per video" and "Per month, money and time" rows, the "Every plan for this video" cards and the tick marks under the length slider.
- **Company menu**: Careers (`/careers` keeps the open application by URL). **Platform menu**: Dashboard (the header has it); MCP server added.
- **Copy that promised what we cannot back**: "We reply within two working days" (contact, done-for-you), "Deleting a project removes its files" (there is no project delete; archiving hides), the duplicate partner questions.

## 25 Nov 2026: English only, All tools, enhancer, support (Tijs's master prompt)

- **Dutch site**: the route folder `src/app/nl/` (every `/nl` page) and the EN | NL switch (`src/components/site/LanguageSwitch.tsx`) are removed; `/nl` and `/nl/*` redirect permanently to the English page (`next.config.ts`), the proxy no longer reads the `clipelle_lang` cookie, the sitemap and metadata carry no hreflang alternates. The Dutch dictionary (`src/content/i18n/nl.ts`) and the `nl` fields in content files stay in the code; nothing renders them. To restore: bring back `src/app/nl/` and `LanguageSwitch.tsx` from git (before this commit) and `LOCALES = ["en", "nl"]` in `src/lib/i18n.ts`.
- **Dashboard**: the page header with the black "New video" button, `QuickStart.tsx` and the four tall stat cards are replaced by `WelcomeBand.tsx` (ink band with the credits), `ToolTiles.tsx` and three numbers in one card (`DashboardStats.tsx`). `QuickStart.tsx` stays in the folder, unused.
- **Sidebar**: "Edit a video" under Projects became the "Video editor" tool in the Create group; the plain "Tools" heading became Workspace / Create / Account; "All tools" opens the page `/tools` (⌘K still opens the quick search).
- **Top bar**: the plain Support link (e-mail or /contact) became the Support menu (`SupportMenu.tsx`).
- **Settings → Brand** (25 Nov 2026, Tijs: "haal het hele kopje brand onder settings weg"): the menu item and the page (`src/app/(app)/settings/brand/`) are gone; `/settings/brand` redirects to `/settings`. Saved caption colours still prefill a new translation and a saved logo still shows in the edit screen's "Brand logo" block (the block is hidden when there is no logo). The "Set your caption colours" step left Getting started; the "Brand style" tool (ads only) and its tip are gone. `BrandSettings.tsx` and `/api/settings/brand*` stay in the code, unused by any screen.
- **Homepage hero fan** (25 Nov 2026, Tijs: "die 6 video's bovenaan mogen weg"): `HeroShowcase` (six phones, three pairs) is off the homepage; the real before-and-after (`TranslateShowcase inHero`, without its own heading) now sits straight under the hero buttons, then the four steps. `HeroShowcase` stays in `Showcase.tsx`, unused.
- **Dashboard welcome band** (25 Nov 2026, after splister.com/app): the ink band with the credits is replaced by a quiet page header with "All tools"; the credits are in the top bar. `WelcomeBand.tsx` stays, unused. The app moved to `/app/...` (old addresses redirect), with an ink sidebar, the account and credits as pills in the top bar, hairline cards and a white work area.
