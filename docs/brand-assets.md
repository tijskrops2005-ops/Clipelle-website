# Brand assets (23 October 2026)

Source: `Clipelle_Brand_Style_Guide` v1.1 (October 2026) and the three logo files Tijs supplied
(`Clipelle-Logo.png`, `Clipelle-Logo-inverse.png`, `Clipelle-favicon.png`). This note records what
was made from them, how, and what is still open. The files live in `public/brand/` and are in git.

## Files

| File | What | Made from |
|---|---|---|
| `clipelle-logo-dark.png`, `-600.png` | Dark logo (black letters, gold symbol), transparent | `Clipelle-Logo.png`, transparent margin trimmed |
| `clipelle-logo-light.png`, `-600.png` | Light logo (champagne letters, gold symbol), transparent | Derived from the dark logo: every non-gold pixel becomes champagne with a soft top-to-bottom gradient; the gold mask is hue-based with a median filter. The supplied "inverse" file had a grey checkerboard drawn into it and could not be used. |
| `clipelle-icon.png` (512), `clipelle-icon-1024.png`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180), `favicon-32.png`, `favicon-16.png`, `favicon-64.png` | App icon, transparent corners | `Clipelle-favicon.png`: the pure-black corners outside the gold frame were flood-filled to transparent, then resized |

Next.js metadata files: `src/app/favicon.ico` (16/32/48), `src/app/icon.png` (64), `src/app/apple-icon.png` (180).
The old generated "C" icons (`icon.tsx`, `apple-icon.tsx`) are gone. `src/app/opengraph-image.tsx` shows the
light logo on ink; the blog article image uses the app icon.

## Where each version is used (`src/components/Logo.tsx`)

- `LogoFull` (dark): site header from `lg` (height 44px ≈ 116px wide), site footer (48px).
- `LogoFull` (light): the dark "Try it with your own product" band on the homepage, the social image.
- `LogoLockup` (icon + "Clipelle" in Geist SemiBold): app sidebar, mobile drawer, site header below `lg`.
  The style guide calls this the compact lockup for spaces under 140px.

## Gold tokens

`globals.css`: `--gold #d68e3c`, `--gold-light #f6c68a`, `--gold-deep #ae662a`, `--champagne #f5ead9`,
exposed as `text-gold`, `bg-gold-light`, … Rule from the guide: gold only on ink (dark band, the
"Our recommendation" badge on the pricing table, captions inside the dark phone illustrations). Never
gold text on paper; red stays the only action colour.

## Open points

- The header shows the full logo at ~116px wide; the guide asks for 140px. Raising it to 140px makes
  the floating bar about 68px tall. Decide when the header is next touched.
- A vector (SVG) redraw of the logo for print and very large sizes (recommended by the guide).
- Contact e-mail on clipelle.com (`NEXT_PUBLIC_SUPPORT_EMAIL`).
- Small red text on paper (4.4:1) and Success/Warning as text on white: see guide §04. Status colours
  are already dots/pills with ink labels in the app; check new site copy before launch.
