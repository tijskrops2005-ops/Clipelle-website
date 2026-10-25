import Link from "next/link";
import type { CSSProperties } from "react";
import { Lightbulb } from "lucide-react";

/**
 * A tip of the day, one of a fixed list, each a fact about how the product works (from the forms,
 * the guides and CLAUDE.md). No promised numbers: a tip says what to do, never what you will gain.
 */
const TIPS: { text: string; href: string; link: string }[] = [
  { text: "A clear product photo on a plain background is the biggest single factor in a good product clip.", href: "/new/ad", link: "Make an ad" },
  { text: "Two or three factual sentences about the product give the script step enough to work with.", href: "/new/ad", link: "Make an ad" },
  { text: "Fill in Offer only when you have one: it is the only way a deal ends up in the call to action.", href: "/new/ad", link: "Make an ad" },
  { text: "Turn on “Review script first” to read and change the script before the presenter speaks it.", href: "/new/ad", link: "Make an ad" },
  { text: "Save your accent colour, caption look, font and logo once; every new ad starts with them.", href: "/settings/brand", link: "Brand style" },
  { text: "Made an ad you like? “Localize this ad” turns it into other languages without a new upload.", href: "/projects", link: "Your projects" },
  { text: "For a translation, one speaker and clear audio give the best voice and lip match.", href: "/new/translate", link: "Translate a video" },
  { text: "Paste a product link and the name, description and photos are filled in for you to check.", href: "/new/url", link: "Ad from a link" },
];

export function TipCard({ day }: { day: number }) {
  const tip = TIPS[day % TIPS.length];
  return (
    <section className="rise rounded-card bg-surface p-5 shadow-card" style={{ "--rise-delay": "520ms" } as CSSProperties} aria-labelledby="tip">
      <h2 id="tip" className="flex items-center gap-2 text-[14px] font-semibold text-accent-hover">
        <Lightbulb className="size-4" aria-hidden /> Tip of the day
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/80">{tip.text}</p>
      <Link href={tip.href} className="focus-ring mt-3 inline-flex rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{tip.link}</Link>
    </section>
  );
}
