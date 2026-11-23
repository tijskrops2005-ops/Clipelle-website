import Link from "next/link";
import { Download } from "lucide-react";
import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { publishedCaseStudies } from "@/content/case-studies";
import { partners } from "@/content/partners";
import { FREE_CREDITS, PLANS, currencyFor, formatMoney, formatPrice, planPrice } from "@/lib/plans";
import { TRANSLATE_LANGUAGES } from "@/lib/translateLanguages";
import { measured } from "@/content/measured";
import { Button } from "@/components/ui/Button";
import { FactList, PageHero, PageSection, StepLines } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { JsonLd } from "@/components/site/JsonLd";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { CareersForm } from "@/components/site/CareersForm";
import { WaitlistForm } from "@/components/site/WaitlistForm";
import { company } from "@/content/company";
import { siteUrl, supportEmail } from "@/lib/brand";

const fill = (s: string, vars: Record<string, string>) => Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

/**
 * Company pages (23 Nov 2026, docs/design-clarity.md): one title, at most one line, then only blocks
 * that carry a fact or an action. No cards with icons, no reassurance sections. The ad-era copy
 * Tijs supplied on 25 Oct 2026 (press hero and pillars, customers pillars) stays in the dictionary
 * and returns with config.features.ads.
 */

export function CustomersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const c = t.customers;
  const L = (x: string) => localizePath(x, locale);
  const stories = publishedCaseStudies();
  const ads = config.features.ads;
  const head = ads ? { title: c.title, text: c.text } : c.translate;
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageHero title={head.title} text={head.text} />
      {stories.length === 0 ? (
        <PageSection title={c.shareTitle} text={c.shareText} className="mx-auto max-w-2xl text-center [&>p]:mx-auto">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={L("/demo")} variant="primary">{t.common.bookDemo}</Button>
            <Button href={L("/examples")} variant="secondary">{c.seeExamples}</Button>
          </div>
        </PageSection>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link href={`/customers/${s.slug}`} className="focus-ring block h-full rounded-card bg-surface p-6 shadow-card hover:shadow-card-hover">
                <p className="text-[13px] text-muted">{s.company}{s.industry ? ` · ${s.industry}` : ""}</p>
                <p className="mt-2 text-[17px] font-semibold text-ink">{s.title}</p>
                <p className="mt-1.5 text-[15px] text-muted">{s.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <FinalCta locale={locale} />
    </div>
  );
}

/** The share in the title, the example in the table, the rules in the questions; one waitlist while there is no sign-up link. */
export function PartnersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.partners;
  const L = (x: string) => localizePath(x, locale);
  const vars = { pct: String(partners.commissionPercent), min: formatPrice(partners.minimumPayoutUsd), platform: partners.platformName };
  const money = (v: number) => formatMoney(v, "usd", locale);
  const monthly = (x: (typeof PLANS)[number]) => planPrice(x, "usd").monthly;
  const pro = PLANS.find((x) => x.key === "pro")!;
  const starter = PLANS.find((x) => x.key === "starter")!;
  const open = Boolean(partners.signupUrl);
  const faq = p.faq.map((f) => ({ q: fill(f.q, vars), a: fill(f.a, vars) }));
  const pct = partners.commissionPercent;
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <div>
        <PageHero title={fill(p.title, vars)} text={fill(p.intro, vars)} actions={open ? <Button href={partners.signupUrl} variant="accent" size="lg">{p.join}</Button> : undefined} />
        {!open && (
          <div className="mx-auto mt-8 max-w-lg text-center">
            <p className="text-[15px] text-muted"><span className="font-medium text-ink">{p.opensSoon}.</span> {p.waitlistText}</p>
            <div className="mt-4 [&>form]:sm:justify-center"><WaitlistForm feature="partners" label={p.waitlistLabel} locale={locale} /></div>
          </div>
        )}
      </div>
      <PageSection title={p.stepsTitle}>
        <StepLines className="lg:grid-cols-3" items={p.steps.map((s) => ({ title: s.title, text: fill(s.text, vars) }))} />
      </PageSection>
      <PageSection title={p.exampleTitle} text={p.exampleText} className="mx-auto max-w-2xl">
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[14px] sm:text-[15px]">
            <thead className="text-[13px] text-muted"><tr><th className="px-4 py-3 font-medium sm:px-5">{p.table.customerOn}</th><th className="px-4 py-3 font-medium sm:px-5">{p.table.pays}</th><th className="px-4 py-3 font-medium sm:px-5">{fill(p.table.yours, vars)}</th><th className="px-4 py-3 font-medium sm:px-5">{p.table.year}</th></tr></thead>
            <tbody className="divide-y divide-divider border-t border-divider">{[starter, pro].map((x) => <tr key={x.key}><td className="px-4 py-3 font-medium text-ink sm:px-5">{x.name}</td><td className="px-4 py-3 sm:px-5">{money(monthly(x))}</td><td className="px-4 py-3 sm:px-5">{money(Math.round(monthly(x) * pct) / 100)}</td><td className="px-4 py-3 sm:px-5">{money(Math.round(monthly(x) * pct * 12) / 100)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-muted">{p.table.note}</p>
      </PageSection>
      <PageSection title={p.faqTitle} className="mx-auto max-w-3xl">
        <Accordion items={faq} />
        <p className="mt-6 text-[13px] text-muted">{p.fullTerms} <Link href={L("/legal/affiliate-terms")} className="underline underline-offset-4">{p.termsLink}</Link>.</p>
      </PageSection>
      <FinalCta locale={locale} />
    </div>
  );
}

export function CareersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const c = t.careers;
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageHero title={c.title} text={c.text} />
      <PageSection title={c.openTitle} text={c.openText} className="mx-auto max-w-2xl">
        <CareersForm locale={locale} />
      </PageSection>
      <FinalCta locale={locale} />
    </div>
  );
}

export function TrustPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const r = t.trust;
  const L = (x: string) => localizePath(x, locale);
  // Files (2), credits (3) and cookies (the last fact) carry a link.
  const linkFor = (i: number) => (i === 2 ? { href: L("/legal/data"), label: r.links.data } : i === 3 ? { href: L("/pricing"), label: r.links.pricing } : i === r.facts.length - 1 ? { href: L("/legal/cookies"), label: r.links.cookies } : null);
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageHero title={r.title} text={r.text} />
      <section className="mx-auto max-w-4xl">
        <FactList
          items={r.facts.map((f, i) => {
            const link = linkFor(i);
            return {
              title: f.title,
              text: (
                <>
                  {f.text.replace("{rights}", config.rightsConfirmationText)}
                  {link && <> <Link href={link.href} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{link.label}</Link></>}
                </>
              ),
            };
          })}
        />
      </section>
      <TrustBlocks />
      <p className="mx-auto max-w-2xl text-center text-[15px] text-muted">
        {r.footer} <Link href={L("/contact")} className="underline underline-offset-4">{r.write}</Link>. {r.drafts} <Link href={L("/legal/terms")} className="underline underline-offset-4">{r.terms}</Link>, <Link href={L("/legal/privacy")} className="underline underline-offset-4">{r.privacy}</Link>, <Link href={L("/legal/data")} className="underline underline-offset-4">{r.dataLink}</Link>, <Link href={L("/legal/cookies")} className="underline underline-offset-4">{r.cookiesLink}</Link>.
      </p>
      <FinalCta locale={locale} />
    </div>
  );
}

/** Press: a title, the facts as a table, the logos, who to write to. No publication logos, numbers or endorsements. */
export function PressPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.press;
  const ads = config.features.ads;
  const v = p.translate;
  const L = (x: string) => localizePath(x, locale);
  const email = supportEmail();
  const site = siteUrl();
  const starter = PLANS.find((x) => x.key === "starter")!;
  const num = (n: number | null) => (n == null ? "–" : locale === "nl" ? String(n).replace(".", ",") : String(n));
  const fillFacts = (x: string) => x
    .replace("{langs}", String(TRANSLATE_LANGUAGES.length))
    .replace("{t}", num(measured.translationMinutes))
    .replace("{a}", num(measured.adMinutes))
    .replace("{price}", formatMoney(planPrice(starter, currencyFor(locale)).monthly, currencyFor(locale), locale))
    .replace("{free}", String(FREE_CREDITS))
    .replace("{founder}", company.operator)
    .replace("{city}", company.city)
    .replace("{country}", company.country[locale]);
  const facts: [string, string][] = [
    ...(ads ? p.facts : v.facts).map((f) => [f.title, fillFacts(f.text)] as [string, string]),
    [p.info.industry, ads ? p.info.industryValue : v.industryValue],
    [p.info.audience, ads ? p.info.audienceValue : v.audienceValue],
    [p.info.website, site.replace(/^https?:\/\//, "")],
    [p.info.company, `${company.operator}, ${company.city} (${company.country[locale]}), KvK ${company.kvk}`],
  ];
  const kit = [
    { file: "clipelle-logo-dark.png", label: p.kit.dark, dark: false },
    { file: "clipelle-logo-light.png", label: p.kit.light, dark: true },
    { file: "clipelle-icon-1024.png", label: p.kit.icon, dark: false },
  ];
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageHero
        title={ads ? p.title : v.title}
        text={ads ? p.text : v.text}
        actions={<>{email ? <Button href={`mailto:${email}`} variant="primary" size="lg">{p.touch}</Button> : <Button href={L("/contact")} variant="primary" size="lg">{p.touch}</Button>}<Button href="#press-kit" variant="secondary" size="lg">{p.logos}</Button></>}
      />

      {ads && (
        <PageSection title={p.teamsTitle} text={p.teamsText}>
          <FactList items={[...p.pillars, ...p.audiences]} />
        </PageSection>
      )}

      <PageSection title={p.factsTitle} className="mx-auto max-w-3xl">
        <dl className="divide-y divide-divider border-y border-divider text-[15px]">
          {facts.map(([k, val]) => (
            <div key={k} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-muted">{k}</dt>
              <dd className="leading-relaxed text-ink">{val}</dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection id="press-kit" title={p.kitTitle} text={p.kitText}>
        <ul className="grid gap-5 sm:grid-cols-3">
          {kit.map((k) => (
            <li key={k.file} className="overflow-hidden rounded-card bg-surface shadow-card">
              <div className={k.dark ? "grid h-40 place-items-center bg-ink p-8" : "grid h-40 place-items-center bg-surface-muted p-8"}>
                {/* eslint-disable-next-line @next/next/no-img-element -- our own logo file, shown as it downloads */}
                <img src={`/brand/${k.file}`} alt={k.label} className="h-20 w-auto max-w-full object-contain" />
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <span className="text-[15px] font-medium text-ink">{k.label}</span>
                <a href={`/brand/${k.file}`} download className="focus-ring inline-flex items-center gap-1.5 rounded-control text-[14px] text-ink underline decoration-border underline-offset-4 hover:decoration-ink"><Download className="size-4" aria-hidden />{p.kit.download}</a>
              </div>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title={ads ? p.mediaTitle : v.mediaTitle} text={ads ? p.mediaText : v.mediaText} className="mx-auto max-w-2xl">
        {email ? <a href={`mailto:${email}`} className="focus-ring rounded-control text-[15px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{email}</a> : <Button href={L("/contact")} variant="secondary">{p.contact}</Button>}
      </PageSection>

      <FinalCta locale={locale} />
    </div>
  );
}
