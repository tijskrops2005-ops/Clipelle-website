import { FORMATS } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";
import type { Locale } from "@/lib/i18n";

/** The format library on the marketing site, in the page language. */
export function FormatCards({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FORMATS.map((f) => {
        const w = locale === "nl" ? f.nl : f;
        return (
          <div key={f.key} className="rounded-card bg-surface p-5 shadow-card">
            <FormatIllustration format={f.key} className="h-10 w-14 text-accent" />
            <p className="mt-3 text-[15px] font-semibold text-ink">{w.name}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{w.blurb}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted/80">{w.worksFor}</p>
          </div>
        );
      })}
    </div>
  );
}
