import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";

export function ExamplesPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.home.examplesEyebrow} title={t.examples.title} text={t.examples.text} />
      <section className="space-y-6"><h2 className="text-title">{t.examples.ads}</h2><ExampleGallery kind="ad" limit={6} locale={locale} /></section>
      <section className="space-y-6"><h2 className="text-title">{t.examples.translations}</h2><ExampleGallery kind="translate" limit={6} locale={locale} /></section>
      <Reveal as="section"><CtaBand locale={locale} /></Reveal>
    </div>
  );
}
