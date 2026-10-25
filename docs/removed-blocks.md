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
