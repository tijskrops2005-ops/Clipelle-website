import Link from "next/link";
import { faq } from "@/content/faq";
import { faqFor } from "@/content/faqI18n";
import { changelogFor } from "@/content/changelog";
import { listedGuides } from "@/content/guides";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { menusFor } from "@/components/site/siteNav";
import { FactList, PageHero } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { JsonLd } from "@/components/site/JsonLd";
import { DemoRequestForm } from "@/components/site/DemoRequestForm";
import { companyAddressLine } from "@/content/company";
import { config } from "@/lib/config";
import { supportEmail } from "@/lib/brand";

/** Small site pages in both languages (23 Nov 2026, docs/design-clarity.md: a title, the content, the closing band). */

export function FaqPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const items = faqFor(locale, faq);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <div>
        <PageHero title={t.faqPage.title} />
        <Accordion items={items} className="mx-auto mt-12 max-w-3xl" />
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

export function ResourcesPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const r = t.resources;
  const menu = menusFor(locale).find((m) => m.key === "resources")!.columns.flatMap((c) => c.items);
  // Each card: a title and a few words (r.cards), plus Examples.
  const items = [...menu.map((c) => ({ href: c.href, title: c.title, text: r.cards[c.href.replace(/^\/nl(?=\/)/, "")] ?? c.text })), { href: localizePath("/examples", locale), title: r.examples.title, text: r.examples.text }];
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero title={r.title} text={locale !== "en" ? t.common.articlesEnglish : undefined} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="focus-ring block h-full rounded-card bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <span className="block text-[17px] font-semibold text-ink">{c.title}</span>
                <span className="mt-1 block text-[14px] text-muted">{c.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

export function ChangelogPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  // The same date form as the blog ("21 Oct 2026", Dutch "21 okt 2026"), in a fixed time zone so the page prerenders.
  const day = new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero title={t.changelog.title} />
        <ol className="mx-auto mt-12 max-w-2xl divide-y divide-divider border-y border-divider">
          {changelogFor(locale).map((e) => (
            <li key={e.date + e.title} className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr] sm:gap-8">
              <p className="text-[13px] text-muted"><time dateTime={e.date}>{day.format(new Date(e.date))}</time></p>
              <div>
                <h2 className="text-[17px] font-semibold text-ink">{e.title}</h2>
                <ul className="mt-2 space-y-1 text-[15px] leading-relaxed text-ink/85">{e.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

export function GuidesIndexPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const g = t.guidesIndex;
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero title={g.title} text={locale !== "en" ? t.common.articlesEnglish : undefined} />
        <ul className="mx-auto mt-12 max-w-2xl divide-y divide-divider border-y border-divider">
          {listedGuides.map((x) => (
            <li key={x.slug}>
              <Link href={`/resources/guides/${x.slug}`} className="focus-ring group grid gap-1 rounded-control py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                <span>
                  <span className="block text-[17px] font-semibold text-ink group-hover:underline decoration-border underline-offset-4">{x.title}</span>
                  <span className="mt-1 block text-[15px] text-muted">{x.summary}</span>
                </span>
                <span className="text-[13px] text-muted">{g.minRead.replace("{n}", String(x.minutes))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
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
      <div>
        <PageHero title={a.title} text={a.text} />
        <section className="mx-auto mt-12 max-w-2xl space-y-5 text-[17px] leading-relaxed text-ink/90">{a.paragraphs.map((p) => <p key={p}>{p}</p>)}</section>
      </div>
      <section className="mx-auto max-w-2xl">
        <h2 className="text-title">{a.valuesTitle}</h2>
        <FactList className="mt-8" columns={1} items={a.values} />
      </section>
      <FinalCta locale={locale} />
    </div>
  );
}

export function DemoPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const head = config.features.ads ? t.demo.ads : t.demo;
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero title={head.title} text={head.text} />
        <div className="mt-12"><DemoRequestForm variant="demo" locale={locale} /></div>
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

export function ContactPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const email = supportEmail();
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero title={t.contact.title} text={t.contact.text} />
        <div className="mt-12"><DemoRequestForm variant="contact" locale={locale} /></div>
        <address className="mx-auto mt-8 max-w-xl text-center text-[13px] not-italic leading-relaxed text-muted">
          {email && (
            <span className="mb-1 block text-[15px]">
              <a href={`mailto:${email}`} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{email}</a>
            </span>
          )}
          {companyAddressLine(locale)}
        </address>
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}
