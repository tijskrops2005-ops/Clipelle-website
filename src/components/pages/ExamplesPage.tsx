import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { FinalCta } from "@/components/site/Persuasion";
import { FormatCards } from "@/components/site/FormatCards";
import { LatestPosts } from "@/components/site/HomeSections";

export function ExamplesPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.home.examplesEyebrow} title={t.examples.title} text={t.examples.text} />
      <section className="space-y-6"><h2 className="text-title">{t.examples.translations}</h2><ExampleGallery kind="translate" limit={6} locale={locale} /></section>
      {/* 27 Oct 2026: the ad samples and the formats show only while ads are on. */}
      {config.features.ads && (
        <>
          <section className="space-y-6"><h2 className="text-title">{t.examples.ads}</h2><ExampleGallery kind="ad" limit={6} locale={locale} /></section>
          <section className="space-y-6">
            <div className="max-w-2xl"><h2 className="text-title">{t.examples.formats}</h2><p className="mt-2 text-[15px] leading-relaxed text-muted">{t.examples.formatsText}</p></div>
            <FormatCards locale={locale} />
          </section>
        </>
      )}
      <LatestPosts locale={locale} categories={["captions-and-formats", "scripts-and-hooks"]} />
      <FinalCta locale={locale} />
    </div>
  );
}
