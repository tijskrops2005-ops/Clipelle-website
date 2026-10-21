import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** A small call-to-action block inside an article, in our own words. */
export function InlineCta({ variant = "ad" }: { variant?: "ad" | "translate" }) {
  const copy = variant === "translate"
    ? { title: "Translate a video you own", text: "Pick the languages, keep your own voice, get captions. The estimate is shown before anything starts.", href: "/platform/translate", label: "How translation works" }
    : { title: "Try it with your own product", text: "One photo and two sentences become a finished 9:16 ad. One free 10-second ad after you verify your e-mail, no card needed.", href: "/signup", label: "Create your first ad free" };
  return (
    <aside className="not-prose my-10 rounded-card bg-surface-muted p-6">
      <p className="text-[17px] font-semibold text-ink">{copy.title}</p>
      <p className="mt-1 text-[15px] text-muted">{copy.text}</p>
      <Button href={copy.href} variant="accent" className="mt-4">{copy.label} <ArrowRight className="size-4" aria-hidden /></Button>
    </aside>
  );
}
