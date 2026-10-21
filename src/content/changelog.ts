export type ChangelogEntry = { date: string; title: string; items: string[] };

/** Customer-facing changes, newest first. Own words; no provider names. */
export const changelog: ChangelogEntry[] = [
  { date: "2026-10-21", title: "Accounts, credits and a public site", items: ["Sign up with e-mail, magic link or password; projects belong to your account.", "Credits: every plan includes a monthly amount, a project reserves credits before it starts and settles afterwards.", "A marketing site with examples, guides, FAQ and pricing."] },
  { date: "2026-10-20", title: "A calmer form and a clearer result", items: ["The ad form is three numbered blocks with a fixed summary; rarely used options sit under Advanced.", "The finished video is the first thing on the project page, with the real amount spent next to the estimate.", "Standard is the recommended presenter quality; Premium shows what it adds."] },
  { date: "2026-10-20", title: "Translations without a waiting step", items: ["Every translated line is checked automatically against the original and corrected where needed.", "All 190 languages and regional variants; several at once; silence trimmed at the start and end.", "Caption position Low or Middle."] },
  { date: "2026-10-19", title: "Captions only", items: ["The only text on screen is the captions of what the presenter says. Hook, benefits and call to action are spoken lines.", "Three spoken hooks to choose from when you review the script.", "Presenter, voice, speed, background and brand style as choices on the form."] },
];
