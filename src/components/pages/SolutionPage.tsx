import type { Solution } from "@/content/solutions";
import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { FactList, PageHero, PageSection, StepLines } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { JsonLd } from "@/components/site/JsonLd";
import { LatestPosts } from "@/components/site/HomeSections";

/**
 * A use-case page (23 Nov 2026, docs/design-clarity.md): title, one line, one button; what you get
 * as a short list; the four steps in a line each; three questions; the articles; the closing band.
 */
export function SolutionPage({ s, locale }: { s: Solution; locale: Locale }) {
  const t = dict(locale);
  const p = t.solutionsPage;
  const L = (x: string) => localizePath(x, locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero
        title={s.title}
        text={s.intro}
        note={t.common.noCard}
        actions={<>
          <Button href={config.features.ads ? "/signup" : `/signup?next=${encodeURIComponent("/app/translate")}`} variant="accent" size="lg">{config.features.ads ? t.common.createFirstAd : t.common.translateFirst}</Button>
          <Button href={L("/demo")} variant="secondary" size="lg">{t.common.bookDemo}</Button>
        </>}
      />
      <PageSection title={p.helps}>
        <FactList items={[...s.helps, ...(s.extra?.items ?? [])]} />
      </PageSection>
      <PageSection title={s.example.title}>
        <StepLines items={s.example.steps.map((x, i) => ({ title: s.example.stepTitles[i] ?? p.step.replace("{n}", String(i + 1)), text: x }))} />
      </PageSection>
      <PageSection title={p.faqTitle.replace("{who}", s.eyebrow.toLowerCase())} className="mx-auto max-w-3xl">
        <Accordion items={s.faq.slice(0, 3)} />
      </PageSection>
      <LatestPosts locale={locale} categories={s.reads ?? (config.features.ads ? ["product-video", "costs-and-process"] : ["translation", "captions-and-formats"])} />
      <FinalCta locale={locale} />
    </div>
  );
}
