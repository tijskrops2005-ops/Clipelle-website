# Van de site gehaalde onderdelen (code bewaard)

Wat op verzoek van Tijs van de site is gehaald, waarom, en hoe het terug kan. De code blijft bestaan, zodat terugzetten één regel is.

## 25 oktober 2026: drie bewegingen van de homepage

| Onderdeel | Waarom weg | Code | Terugzetten |
|---|---|---|---|
| **Lopende feitenbalk** (donkere balk met feiten, "facts ticker") | Er bewogen drie rijen tegelijk (deze balk, de talenmuur en de voorbeeldenrij). De balk herhaalde feiten die elders al staan en maakte de pagina onrustig. | `FactsTicker` in `src/components/site/Persuasion.tsx`; teksten in `home.ticker` (en/nl) | In `src/components/pages/HomePage.tsx` na `<LiveStats />`: `<FactsTicker items={h.ticker} />` en de import weer toevoegen. |
| **Advertentie-demo "One form, one click, one finished ad"** | Bijna hetzelfde als de demo bij "Ads from a photo" (`AdsDemo`), en vertalen is nu het hoofdproduct. Plan: vervangen door een zelfspelende vertaaldemo. | `src/components/site/ProductDemo.tsx`; `.demo-*`-keyframes in `globals.css`; teksten in `home.demo` | In `HomePage.tsx` na de feitenbalk: `<ProductDemo locale={locale} />` en de import. |
| **Vervaging bij het inscrollen** (elk blok werd scherp uit een blur) | Bij elk blok oogt dat druk. Een korte fade met een kleine stijging is rustiger. | `@keyframes reveal-in` in `src/app/globals.css` | In de `from`-regel weer `scale(0.985); filter: blur(10px)` toevoegen en in `to` `filter: blur(0)`, met `translateY(22px)` in plaats van `14px`. |
