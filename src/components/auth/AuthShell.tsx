import Link from "next/link";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { TRANSLATE_LANGUAGES } from "@/lib/translateLanguages";
import { LogoFull } from "@/components/Logo";
import { Year } from "@/components/site/Year";

/**
 * The sign-in screens: an ink panel on the left with the light logo, one headline and three short
 * facts; one card on the right. Below lg only the card, with the dark logo above. Calm since
 * 23 Nov 2026: no glows, no entrance animation, facts of a few words.
 */
const PANELS = {
  login: {
    title: "Your videos are where you left them.",
    points: ["Every finished video kept", "Paid credits never expire", "Credits shown before you start"],
  },
  signup: {
    title: "Your video, in every language, in your own voice.",
    points: ["Own voice, lip sync", `${TRANSLATE_LANGUAGES.length} languages`, "Every line checked"],
  },
} as const;

export function AuthShell({ panel = "signup", children }: { panel?: keyof typeof PANELS; children: ReactNode }) {
  const p = PANELS[panel];
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden bg-ink px-12 py-10 text-champagne lg:flex lg:flex-col">
        <Link href="/" aria-label={`${brand.name} home`} className="focus-ring w-fit rounded-control">
          <LogoFull tone="light" className="h-10" />
        </Link>
        <div className="my-auto max-w-lg">
          <h1 className="text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-champagne">{p.title}</h1>
          <ul className="mt-8 space-y-2 text-[15px] text-champagne/75">
            {p.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
        <p className="text-[13px] text-champagne/50">© <Year /> {brand.name}</p>
      </aside>

      <main className="flex flex-col items-center justify-start px-4 py-10 sm:px-8 lg:justify-center">
        <Link href="/" aria-label={`${brand.name} home`} className="focus-ring mb-8 rounded-control lg:hidden">
          <LogoFull className="h-10" />
        </Link>
        <div className="w-full max-w-[420px]">{children}</div>
        <Link href="/" className="focus-ring mt-8 rounded-control text-[13px] text-muted transition-colors duration-150 hover:text-ink">Back to the website</Link>
      </main>
    </div>
  );
}

/** The white card on the right: title, one line, then the form. */
export function AuthCard({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      {text && <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{text}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
