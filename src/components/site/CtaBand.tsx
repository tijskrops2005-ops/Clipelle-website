import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/** The closing block of most site pages: the one accent button, Book a demo, and the honest free-ad line. */
export function CtaBand({ title, text, locale = "en", variant = "ad" }: { title?: string; text?: string; locale?: Locale; variant?: "ad" | "translate" }) {
  const t = dict(locale);
  const heading = title ?? (variant === "translate" ? t.cta.translateTitle : t.cta.title);
  const body = text ?? (variant === "translate" ? t.cta.translateText : t.cta.text);
  return (
    <section className="rounded-card bg-surface px-6 py-14 text-center shadow-card sm:py-16">
      <h2 className="text-display">{heading}</h2>
      <p className="mx-auto mt-3 max-w-md text-subtitle text-muted">{body}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/signup" variant="accent" size="lg">
          {t.common.createFirstAd}
          <ArrowRight className="size-5" aria-hidden />
        </Button>
        <Button href={localizePath("/demo", locale)} variant="secondary" size="lg">
          {t.common.bookDemo}
        </Button>
      </div>
      <p className="mt-4 text-[13px] text-muted">{t.common.noCardLong}</p>
    </section>
  );
}
