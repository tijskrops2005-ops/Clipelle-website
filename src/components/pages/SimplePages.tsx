import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { faq } from "@/content/faq";
import { faqFor } from "@/content/faqI18n";
import { changelogFor } from "@/content/changelog";
import { guides } from "@/content/guides";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { menusFor } from "@/components/site/siteNav";
import { Button } from "@/components/ui/Button";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { JsonLd } from "@/components/site/JsonLd";
import { DemoRequestForm } from "@/components/site/DemoRequestForm";
import { MenuCard } from "@/components/site/MenuCard";
import { companyLine } from "@/content/company";
import { supportEmail } from "@/lib/brand";

/** Small site pages in both languages: FAQ, resources, changelog, guides index, about, demo, contact. */

export function FaqPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const items = faqFor(locale, faq);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <SectionIntro eyebrow={t.common.faq} title={t.faqPage.title} text={t.faqPage.text} />
      <Accordion items={items} className="mx-auto max-w-3xl" />
      <CtaBand locale={locale} />
    </div>
  );
}

export function ResourcesPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const items = menusFor(locale).find((m) => m.key === "resources")!.columns.flatMap((c) => c.items);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.nav.resources.label} title={t.resources.title} />
      {locale !== "en" && <p className="text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      <ul className="grid gap-5 md:grid-cols-3">
        {items.map((c) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"><MenuCard card={c} soonLabel={t.common.soon} /></li>
        ))}
      </ul>
    </div>
  );
}

export function ChangelogPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.changelog.metaTitle} title={t.changelog.title} text={t.changelog.text} />
      <ol className="mx-auto max-w-2xl space-y-8">
        {changelogFor(locale).map((e) => (
          <li key={e.date + e.title} className="rounded-card bg-surface p-6 shadow-card">
            <p className="label-mono text-muted">{e.date}</p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">{e.title}</h2>
            <ul className="mt-3 space-y-1.5 text-[15px] text-ink/85">{e.items.map((i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{i}</li>)}</ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GuidesIndexPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.guidesIndex.metaTitle} title={t.guidesIndex.title} text={t.guidesIndex.text} />
      {locale !== "en" && <p className="text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      <ul className="grid gap-5 md:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/resources/guides/${g.slug}`} className="focus-ring group flex h-full flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="label-mono flex items-center gap-1.5 text-muted"><Clock3 className="size-3.5" aria-hidden /> {g.minutes} min</span>
              <span className="mt-3 text-[17px] font-semibold text-ink">{g.title}</span>
              <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{g.summary}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">{t.common.read} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AboutPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const a = t.about;
  const L = (p: string) => localizePath(p, locale);
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", name: a.title, url: absoluteUrl(L("/about")) }} />
      <SectionIntro eyebrow={a.eyebrow} title={a.title} text={a.text} />
      <section className="mx-auto max-w-2xl space-y-5 text-[17px] leading-relaxed text-ink/90">{a.paragraphs.map((p) => <p key={p}>{p}</p>)}</section>
      <section>
        <SectionIntro eyebrow={a.valuesEyebrow} title={a.valuesTitle} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">{a.values.map((v) => <li key={v.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{v.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{v.text}</p></li>)}</ul>
      </section>
      <section className="rounded-card bg-surface p-8 text-center shadow-card">
        <h2 className="text-title">{a.talkTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">{a.talkText}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button href={L("/demo")} variant="primary">{t.common.bookDemo}</Button><Button href={L("/contact")} variant="secondary">{a.contact}</Button></div>
      </section>
      <CtaBand locale={locale} />
    </div>
  );
}

export function DemoPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="space-y-12 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.demo.eyebrow} title={t.demo.title} text={t.demo.text} />
      <DemoRequestForm variant="demo" locale={locale} />
    </div>
  );
}

export function ContactPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const email = supportEmail();
  return (
    <div className="space-y-12 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.contact.eyebrow} title={t.contact.title} text={t.contact.text} />
      <DemoRequestForm variant="contact" locale={locale} />
      <address className="mx-auto max-w-xl text-center text-[13px] not-italic leading-relaxed text-muted">
        {email && (
          <span className="mb-2 block text-[15px]">
            {locale === "nl" ? "Liever direct mailen?" : "Prefer e-mail?"}{" "}
            <a href={`mailto:${email}`} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{email}</a>
          </span>
        )}
        {companyLine(locale)}
      </address>
    </div>
  );
}
