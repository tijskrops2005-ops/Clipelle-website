import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { brand } from "@/lib/brand";
import { LogoFull } from "@/components/Logo";
import { Year } from "@/components/site/Year";

/**
 * The sign-in screens: brand panel on the left (ink with the light logo and a gold glow, the
 * brand's dark moment), one card on the right. Below lg only the card, with the dark logo above.
 * The points on the left are product facts, never promises.
 */
const PANELS = {
  login: {
    title: "Welcome back. Your videos are where you left them.",
    points: ["Every finished video stays in your projects", "Credits never expire", "The cost is shown before anything starts"],
  },
  signup: {
    title: "Your video, in every language, with your own voice.",
    points: ["30 free credits after you verify your e-mail", "No credit card required", "Every translated line is checked before the render"],
  },
} as const;

export function AuthShell({ panel = "signup", children }: { panel?: keyof typeof PANELS; children: ReactNode }) {
  const p = PANELS[panel];
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink px-12 py-10 text-champagne lg:flex lg:flex-col">
        <div className="glow-field gold -right-24 -top-24 h-96 w-96" aria-hidden />
        <div className="glow-field gold-deep -bottom-32 left-10 h-96 w-96" aria-hidden />
        <Link href="/" aria-label={`${brand.name} home`} className="focus-ring relative w-fit rounded-control">
          <LogoFull tone="light" className="h-10" />
        </Link>
        <div className="relative my-auto max-w-lg">
          <h1 className="rise text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-champagne">{p.title}</h1>
          <ul className="mt-8 space-y-3">
            {p.points.map((point, i) => (
              <li key={point} className="rise flex items-center gap-3 text-[15px] text-champagne/80" style={{ "--rise-delay": `${150 + i * 90}ms` } as CSSProperties}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-light ring-1 ring-gold/30"><Check className="size-3.5" aria-hidden /></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] text-champagne/50">© <Year /> {brand.name}</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" aria-label={`${brand.name} home`} className="focus-ring mb-8 rounded-control lg:hidden">
          <LogoFull className="h-10" />
        </Link>
        <div className="rise w-full max-w-[420px]" style={{ "--rise-delay": "60ms" } as CSSProperties}>{children}</div>
        <Link href="/" className="focus-ring mt-8 rounded-control text-[13px] text-muted transition-colors duration-150 hover:text-ink">← Back to the website</Link>
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
