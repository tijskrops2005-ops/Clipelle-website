import Link from "next/link";
import { ArrowRight, Film } from "lucide-react";
import { faq } from "@/content/faq";
import { faqFor } from "@/content/faqI18n";
import { changelogFor } from "@/content/changelog";
import { listedGuides } from "@/content/guides";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { menusFor } from "@/components/site/siteNav";
import { SectionIntro } from "@/components/site/SectionIntro";
import { PageHero } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { JsonLd } from "@/components/site/JsonLd";
import { DemoRequestForm } from "@/components/site/DemoRequestForm";
import { MenuCard } from "@/components/site/MenuCard";
import { companyAddressLine } from "@/content/company";
import { config } from "@/lib/config";
import { supportEmail } from "@/lib/brand";

/** Small site pages in both languages: FAQ, resources, changelog, guides index, about, demo, contact. */

export function FaqPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const items = faqFor(locale, faq);
  return (
    <div className="space-y-16">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero eyebrow={t.common.faq} title={t.faqPage.title} text={t.faqPage.text} />
      <Accordion items={items} className="mx-auto max-w-3xl" />
      <FinalCta locale={locale} />
    </div>
  );
}

export function ResourcesPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const r = t.resources;
  const menu = menusFor(locale).find((m) => m.key === "resources")!.columns.flatMap((c) => c.items);
  // The hub says a card in its own words where the menu line is about something else (r.cards), and adds Examples, so nine cards fill three rows.
  const items = [...menu.map((c) => ({ ...c, text: r.cards[c.href.replace(/^\/nl(?=\/)/, "")] ?? c.text })), { href: localizePath("/examples", locale), title: r.examples.title, text: r.examples.text, icon: Film }];
  return (
    <div className="space-y-16">
      <PageHero eyebrow={t.nav.resources.label} title={r.title} />
      {locale !== "en" && <p className="text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"><MenuCard card={c} soonLabel={t.common.soon} /></li>
        ))}
      </ul>
      <FinalCta locale={locale} />
    </div>
  );
}

export function ChangelogPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  // The same date form as the blog ("21 Oct 2026", Dutch "21 okt 2026"), in a fixed time zone so the page prerenders.
  const day = new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow={t.changelog.metaTitle} title={t.changelog.title} text={t.changelog.text} />
      <ol className="mx-auto max-w-2xl space-y-8">
        {changelogFor(locale).map((e) => (
          <li key={e.date + e.title} className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[13px] text-muted"><time dateTime={e.date}>{day.format(new Date(e.date))}</time></p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">{e.title}</h2>
            <ul className="mt-3 space-y-1.5 text-[15px] text-ink/85">{e.items.map((i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{i}</li>)}</ul>
          </li>
        ))}
      </ol>
      <FinalCta locale={locale} />
    </div>
  );
}

export function GuidesIndexPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const g = t.guidesIndex;
  // Two guides sit side by side; a third makes it three columns (no empty slot).
  const cols = listedGuides.length >= 3 ? "md:grid-cols-3" : "mx-auto max-w-3xl md:grid-cols-2";
  return (
    <div className="space-y-16">
      <PageHero eyebrow={g.metaTitle} title={g.title} text={g.text} />
      {locale !== "en" && <p className="text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      <ul className={`grid gap-5 ${cols}`}>
        {listedGuides.map((x) => (
          <li key={x.slug}>
            <Link href={`/resources/guides/${x.slug}`} className="focus-ring group flex h-full flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="text-[13px] text-muted">{g.minRead.replace("{n}", String(x.minutes))}</span>
              <span className="mt-3 text-[17px] font-semibold text-ink">{x.title}</span>
              <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{x.summary}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">{t.common.read} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
      <FinalCta locale={locale} />
    </div>
  );
}

export function AboutPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const a = t.about;
  const L = (p: string) => localizePath(p, locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", name: a.title, url: absoluteUrl(L("/about")) }} />
      <PageHero eyebrow={a.eyebrow} title={a.title} text={a.text} />
      <section className="mx-auto max-w-2xl space-y-5 text-[17px] leading-relaxed text-ink/90">{a.paragraphs.map((p) => <p key={p}>{p}</p>)}</section>
      <section>
        <SectionIntro eyebrow={a.valuesEyebrow} title={a.valuesTitle} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">{a.values.map((v) => <li key={v.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{v.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{v.text}</p></li>)}</ul>
      </section>
      <FinalCta locale={locale} />
    </div>
  );
}

export function DemoPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const head = config.features.ads ? t.demo.ads : t.demo;
  return (
    <div className="space-y-16 sm:space-y-24">
      <div className="space-y-12">
        <PageHero eyebrow={t.demo.eyebrow} title={head.title} text={head.text} />
        <DemoRequestForm variant="demo" locale={locale} />
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

export function ContactPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const email = supportEmail();
  return (
    <div className="space-y-16 sm:space-y-24">
      <div className="space-y-12">
      <PageHero eyebrow={t.contact.eyebrow} title={t.contact.title} text={t.contact.text} />
      <DemoRequestForm variant="contact" locale={locale} />
      <address className="mx-auto max-w-xl text-center text-[13px] not-italic leading-relaxed text-muted">
        {email && (
          <span className="mb-2 block text-[15px]">
            {locale === "nl" ? "Liever direct mailen?" : "Prefer e-mail?"}{" "}
            <a href={`mailto:${email}`} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{email}</a>
          </span>
        )}
        {/* The registration numbers are in the footer right below; here only who and where. */}
        {companyAddressLine(locale)}
      </address>
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}
