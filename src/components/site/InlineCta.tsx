import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";
import { FREE_CREDITS } from "@/lib/plans";

/**
 * A small call-to-action block inside an article, in our own words. While ads are switched off
 * (23 Nov 2026) every article gets the translation one: an article must not send a reader to a tool
 * that is not open. It sits outside the article's prose styles, so the pill is never underlined.
 */
export function InlineCta({ variant = "ad" }: { variant?: "ad" | "translate" }) {
  const copy = variant === "translate" || !config.features.ads
    ? { title: "Translate a video you own", text: `Pick the languages, keep the speaker's own voice, get captions. ${FREE_CREDITS} free credits after you verify your e-mail, no card needed.`, href: "/signup", label: "Translate your first video free" }
    : { title: "Try it with your own product", text: `One photo and two sentences become a finished 9:16 ad. ${FREE_CREDITS} free credits after you verify your e-mail, no card needed.`, href: "/signup", label: "Create your first ad free" };
  return (
    <aside className="my-10 rounded-card bg-surface-muted p-6">
      <p className="text-[17px] font-semibold text-ink">{copy.title}</p>
      <p className="mt-1 text-[15px] text-muted">{copy.text}</p>
      <Button href={copy.href} variant="accent" className="mt-4">{copy.label} <ArrowRight className="size-4" aria-hidden /></Button>
    </aside>
  );
}
