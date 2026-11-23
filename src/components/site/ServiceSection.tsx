import { Button } from "@/components/ui/Button";
import { SectionIntro } from "@/components/site/SectionIntro";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/** "Winning ads, made for you": the managed service. Numbers and times only from src/content/services.ts; no price. */
export function ServiceSection({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const t = dict(locale);
  // 23 Nov 2026 (docs/design-clarity.md): title, one line, one button. Volume and turnaround stay on /services/done-for-you.
  return (
    <section className="rounded-card bg-ink px-6 py-12 text-surface sm:px-10 sm:py-14">
      <SectionIntro title={t.service.title} text={t.service.text} className="[&_h2]:text-surface [&_p]:text-surface/70" />
      <div className="mt-8 flex justify-center">
        <Button href={localizePath(compact ? "/demo" : "/services/done-for-you", locale)} variant="secondary" size="lg">{compact ? t.common.bookDemo : t.service.how}</Button>
      </div>
    </section>
  );
}
