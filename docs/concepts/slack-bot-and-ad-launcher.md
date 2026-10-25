# Concept: Slack bot en Ad Launcher (van de site gehaald op 25 oktober 2026)

Op verzoek van Tijs staan deze twee "binnenkort"-pagina's niet meer op de site: ze beschreven functies die nog niet bestaan. Het concept is bewaard.

- **Teksten** (EN en NL): `integrations.slack` en `integrations.adLauncher` in `src/content/i18n/en.ts` en `nl.ts`.
- **Pagina-componenten**: `IntegrationSlackPage` en `IntegrationAdLauncherPage` in `src/components/pages/IntegrationPages.tsx` (met het wachtlijstformulier).
- **Wachtlijst**: tabel `waitlist`, `src/lib/waitlistFeatures.ts`, overzicht op `/dev/waitlist`. Eerdere aanmeldingen blijven daar staan.

## Wat het idee was

- **Slack-bot**: in een Slack-kanaal de bot noemen met een productlink of foto en twee zinnen; de bot vraagt lengte en kwaliteit, start de video in je Clipelle-workspace (zelfde credits en limieten) en zet de link naar het resultaat in de thread.
- **Ad Launcher**: een afgeronde video als concept-creative naar een gekoppeld advertentieaccount sturen, met de ondertiteltekst erbij. Geen campagnes starten, targeten of budgetteren (dat blijft buiten de scope, regel 5 in CLAUDE.md).

## Terugzetten

1. De vier routebestanden terugzetten uit git: `git show 6e8d133:"src/app/(site)/integrations/slack/page.tsx"` (en `ad-launcher`, en de twee onder `src/app/nl/integrations/`).
2. De twee regels terug in `src/components/site/siteNav.ts` (kolom Integrations) en in `SOON_TOOLS` in `src/components/tools.ts`, met de iconen `MessageSquare` en `Rocket`.
