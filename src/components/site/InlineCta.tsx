import { Button } from "@/components/ui/Button";
import { config } from "@/lib/config";
import { FREE_CREDITS } from "@/lib/plans";

/**
 * One call-to-action block inside an article. While ads are switched off (23 Nov 2026) every
 * article gets the translation one: an article must not send a reader to a tool that is not open.
 */
export function InlineCta({ variant = "ad" }: { variant?: "ad" | "translate" }) {
  const copy = variant === "translate" || !config.features.ads
    ? { title: "Translate a video you own", text: `${FREE_CREDITS} free credits to try. No credit card.`, href: "/signup", label: "Start for free" }
    : { title: "Make an ad from a photo", text: `${FREE_CREDITS} free credits to try. No credit card.`, href: "/signup", label: "Start for free" };
  return (
    <aside className="my-10 flex flex-col gap-4 rounded-card bg-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[17px] font-semibold text-ink">{copy.title}</p>
        <p className="mt-1 text-[15px] text-muted">{copy.text}</p>
      </div>
      <Button href={copy.href} variant="primary" className="shrink-0">{copy.label}</Button>
    </aside>
  );
}
