export type ChangelogEntry = { date: string; title: string; items: string[] };

/** Customer-facing changes, newest first. Own words; no provider names. */
export const changelog: ChangelogEntry[] = [
  { date: "2026-10-21", title: "Accounts, credits and a public site", items: ["Sign up with e-mail, magic link or password; projects belong to your account.", "Credits: every plan includes a monthly amount, a project reserves credits before it starts and settles afterwards.", "A marketing site with examples, guides, FAQ and pricing."] },
  { date: "2026-10-20", title: "A calmer form and a clearer result", items: ["The ad form is three numbered blocks with a fixed summary; rarely used options sit under Advanced.", "The finished video is the first thing on the project page, with the real amount spent next to the estimate.", "Standard is the recommended presenter quality; Premium shows what it adds."] },
  { date: "2026-10-20", title: "Translations without a waiting step", items: ["Every translated line is checked automatically against the original and corrected where needed.", "All 190 languages and regional variants; several at once; silence trimmed at the start and end.", "Caption position Low or Middle."] },
  { date: "2026-10-19", title: "Captions only", items: ["The only text on screen is the captions of what the presenter says. Hook, benefits and call to action are spoken lines.", "Three spoken hooks to choose from when you review the script.", "Presenter, voice, speed, background and brand style as choices on the form."] },
];

/** Dutch entries, keyed by the English title; an entry without a translation shows in English. */
export const changelogNl: Record<string, ChangelogEntry> = {
  "Accounts, credits and a public site": { date: "2026-10-21", title: "Accounts, credits en een openbare site", items: ["Aanmelden met e-mail, inloglink of wachtwoord; projecten horen bij je account.", "Credits: elk plan bevat een maandelijks aantal, een project reserveert credits voordat het start en rekent daarna af.", "Een marketingsite met voorbeelden, gidsen, veelgestelde vragen en prijzen."] },
  "A calmer form and a clearer result": { date: "2026-10-20", title: "Een rustiger formulier en een duidelijker resultaat", items: ["Het advertentieformulier bestaat uit drie genummerde blokken met een vaste samenvatting; zelden gebruikte opties staan onder Geavanceerd.", "De afgeronde video is het eerste op de projectpagina, met het werkelijk bestede bedrag naast de schatting.", "Standard is de aanbevolen presentatorkwaliteit; Premium laat zien wat het toevoegt."] },
  "Translations without a waiting step": { date: "2026-10-20", title: "Vertalingen zonder wachtstap", items: ["Elke vertaalde regel wordt automatisch vergeleken met het origineel en waar nodig gecorrigeerd.", "Alle 190 talen en regionale varianten; meerdere tegelijk; stilte aan begin en eind weggeknipt.", "Ondertitelpositie Laag of Midden."] },
  "Captions only": { date: "2026-10-19", title: "Alleen ondertitels", items: ["De enige tekst in beeld zijn de ondertitels van wat de presentator zegt. Hook, voordelen en oproep tot actie zijn gesproken zinnen.", "Drie gesproken hooks om uit te kiezen als je het script bekijkt.", "Presentator, stem, tempo, achtergrond en merkstijl als keuzes op het formulier."] },
};
export const changelogFor = (locale: "en" | "nl") => (locale === "en" ? changelog : changelog.map((e) => changelogNl[e.title] ?? e));
