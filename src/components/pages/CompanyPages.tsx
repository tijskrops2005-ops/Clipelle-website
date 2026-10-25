import Link from "next/link";
import { ArrowRight, BookOpen, Handshake, Mail, ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { publishedCaseStudies } from "@/content/case-studies";
import { partners } from "@/content/partners";
import { PLANS, formatPrice } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { JsonLd } from "@/components/site/JsonLd";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { CareersForm } from "@/components/site/CareersForm";
import { LogoFull } from "@/components/Logo";
import { company } from "@/content/company";
import { siteUrl, supportEmail } from "@/lib/brand";

const fill = (s: string, vars: Record<string, string>) => Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

export function CustomersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const c = t.customers;
  const L = (x: string) => localizePath(x, locale);
  const stories = publishedCaseStudies();
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow={c.eyebrow} title={c.title} text={c.text} />
      <ul className="grid gap-5 md:grid-cols-2">
        {c.pillars.map((p) => <li key={p.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{p.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{p.text}</p></li>)}
      </ul>
      {stories.length === 0 ? (
        <section className="mx-auto max-w-2xl rounded-card bg-surface p-8 text-center shadow-card">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><BookOpen className="size-5" aria-hidden /></span>
          <h2 className="mt-5 text-title">{c.soonTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">{c.soonText}</p>
          <p className="mx-auto mt-6 max-w-md border-t border-divider pt-6 text-[15px] text-muted"><span className="font-semibold text-ink">{c.shareTitle}.</span> {c.shareText}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button href={L("/demo")} variant="primary">{t.common.bookDemo} <ArrowRight className="size-4" aria-hidden /></Button><Button href={L("/examples")} variant="secondary">{c.seeExamples}</Button></div>
        </section>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">{stories.map((s) => <li key={s.slug}><Link href={`/customers/${s.slug}`} className="focus-ring block h-full rounded-card bg-surface p-6 shadow-card hover:shadow-card-hover"><p className="label-mono text-muted">{s.company}{s.industry ? ` · ${s.industry}` : ""}</p><p className="mt-2 text-[20px] font-semibold text-ink">{s.title}</p><p className="mt-2 text-[15px] text-muted">{s.summary}</p></Link></li>)}</ul>
      )}
      <CtaBand locale={locale} />
    </div>
  );
}

export function PartnersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.partners;
  const L = (x: string) => localizePath(x, locale);
  const vars = { pct: String(partners.commissionPercent), min: formatPrice(partners.minimumPayoutUsd), platform: partners.platformName };
  const pro = PLANS.find((x) => x.key === "pro")!;
  const starter = PLANS.find((x) => x.key === "starter")!;
  const open = Boolean(partners.signupUrl);
  const faq = p.faq.map((f) => ({ q: fill(f.q, vars), a: fill(f.a, vars) }));
  const pct = partners.commissionPercent;
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="pt-16 sm:pt-24">
        <p className="label-mono text-muted">{p.eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{fill(p.title, vars)}</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">{fill(p.intro, vars)}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {open ? <Button href={partners.signupUrl} variant="accent" size="lg">{p.join} <ArrowRight className="size-5" aria-hidden /></Button> : <><Badge tone="warning">{p.opensSoon}</Badge><Link href={L("/contact")} className="focus-ring rounded-control text-[15px] underline decoration-border underline-offset-4 hover:decoration-ink">{p.interested}</Link></>}
        </div>
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={p.stepsTitle} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={3} items={p.steps.map((s) => ({ title: s.title, text: fill(s.text, vars) }))} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.benefitsEyebrow} title={p.benefitsTitle} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{p.benefits.map((b) => <li key={b.title} className="rounded-card bg-surface p-6 shadow-card"><span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Handshake className="size-4" aria-hidden /></span><p className="mt-4 text-[17px] font-semibold text-ink">{fill(b.title, vars)}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{fill(b.text, vars)}</p></li>)}</ul>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.exampleEyebrow} title={p.exampleTitle} text={p.exampleText} />
        <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">{p.table.customerOn}</th><th className="px-5 py-3 font-medium">{p.table.pays}</th><th className="px-5 py-3 font-medium">{fill(p.table.yours, vars)}</th><th className="px-5 py-3 font-medium">{p.table.year}</th></tr></thead>
            <tbody className="divide-y divide-divider">{[starter, pro].map((x) => <tr key={x.key}><td className="px-5 py-3 font-medium text-ink">{x.name}</td><td className="px-5 py-3">{formatPrice(x.monthlyUsd)}</td><td className="px-5 py-3">{formatPrice(Math.round(x.monthlyUsd * pct) / 100)}</td><td className="px-5 py-3">{formatPrice(Math.round(x.monthlyUsd * pct * 12) / 100)}</td></tr>)}</tbody>
          </table>
          <p className="px-5 py-3 text-[13px] text-muted">{p.table.note}</p>
        </div>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={p.faqTitle} />
        <Accordion items={faq} className="mx-auto mt-10 max-w-3xl" />
        <p className="mt-6 text-center text-[13px] text-muted">{p.fullTerms} <Link href={L("/legal/affiliate-terms")} className="underline">{p.termsLink}</Link>.</p>
      </Reveal>
      <Reveal as="section" className="rounded-card bg-surface px-6 py-14 text-center shadow-card">
        <h2 className="text-display">{p.readyTitle}</h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {open ? <Button href={partners.signupUrl} variant="accent" size="lg">{p.join} <ArrowRight className="size-5" aria-hidden /></Button> : <><Badge tone="warning">{p.opensSoon}</Badge><Button href={L("/contact")} variant="secondary" size="lg">{p.contact}</Button></>}
        </div>
      </Reveal>
    </div>
  );
}

export function CareersPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const c = t.careers;
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow={c.eyebrow} title={c.title} text={c.text} />
      <section><ul className="grid gap-5 sm:grid-cols-2">{c.values.map((v) => <li key={v.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{v.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{v.text}</p></li>)}</ul></section>
      <section className="mx-auto max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-title">{c.openTitle}</h2><Badge tone="warning">{c.noRoles}</Badge></div>
        <p className="mb-6 mt-2 text-[15px] text-muted">{c.openText}</p>
        <CareersForm locale={locale} />
      </section>
    </div>
  );
}

export function TrustPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const r = t.trust;
  const L = (x: string) => localizePath(x, locale);
  const linkFor = (i: number) => (i === 2 ? { href: L("/legal/data"), label: r.links.data } : i === 4 ? { href: L("/pricing"), label: r.links.pricing } : i === 8 ? { href: L("/legal/cookies"), label: r.links.cookies } : null);
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow={r.eyebrow} title={r.title} text={r.text} />
      <section>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {r.facts.map((f, i) => {
            const link = linkFor(i);
            return (
              <li key={f.title} className="flex flex-col rounded-card bg-surface p-6 shadow-card">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><ShieldCheck className="size-4" aria-hidden /></span>
                <p className="mt-4 text-[17px] font-semibold text-ink">{f.title}</p>
                <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{f.text.replace("{rights}", config.rightsConfirmationText)}</p>
                {link && <Link href={link.href} className="focus-ring mt-4 w-fit rounded-control text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{link.label}</Link>}
              </li>
            );
          })}
        </ul>
      </section>
      <TrustBlocks />
      <section className="mx-auto max-w-2xl text-center text-[15px] text-muted">
        <p>{r.footer} <Link href={L("/contact")} className="underline">{r.write}</Link>. {r.drafts} <Link href={L("/legal/terms")} className="underline">{r.terms}</Link>, <Link href={L("/legal/privacy")} className="underline">{r.privacy}</Link>, <Link href={L("/legal/data")} className="underline">{r.dataLink}</Link>, <Link href={L("/legal/cookies")} className="underline">{r.cookiesLink}</Link>.</p>
      </section>
      <CtaBand locale={locale} />
    </div>
  );
}

/**
 * Press and brand information (/press, 25 Oct 2026). Copy supplied by Tijs; no publication logos,
 * customer numbers or endorsements here: those appear only from src/content/trust.ts with permission.
 */
export function PressPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.press;
  const L = (x: string) => localizePath(x, locale);
  const email = supportEmail();
  const site = siteUrl();
  const rows: [string, string][] = [
    [p.info.brand, config.productName],
    [p.info.industry, p.info.industryValue],
    [p.info.audience, p.info.audienceValue],
    [p.info.website, site.replace(/^https?:\/\//, "")],
    [p.info.company, `${company.operator} · ${company.city}, ${company.country[locale]} · KvK ${company.kvk}`],
  ];
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <section className="text-center">
        <SectionIntro eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href={L("/")} variant="accent" size="lg">{p.explore}<ArrowRight className="size-5" aria-hidden /></Button>
          <Button href={L("/contact")} variant="secondary" size="lg">{p.touch}</Button>
        </div>
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow={p.teamsEyebrow} title={p.teamsTitle} text={p.teamsText} />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {p.pillars.map((x) => <li key={x.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{x.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{x.text}</p></li>)}
        </ul>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow={p.forEyebrow} title={p.forTitle} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {p.audiences.map((x) => <li key={x.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold text-ink">{x.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted">{x.text}</p></li>)}
        </ul>
      </Reveal>

      <Reveal as="section" className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-card bg-surface p-8 shadow-card">
          <p className="label-mono text-muted">{p.mediaEyebrow}</p>
          <h2 className="mt-3 text-title">{p.mediaTitle}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{p.mediaText}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={L("/contact")} variant="primary">{p.contact}<ArrowRight className="size-4" aria-hidden /></Button>
            {email && <a href={`mailto:${email}`} className="focus-ring inline-flex items-center gap-2 rounded-control text-[15px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink"><Mail className="size-4" aria-hidden />{email}</a>}
          </div>
        </div>
        <div className="rounded-card bg-surface p-8 shadow-card">
          <LogoFull className="h-9 w-auto" />
          <h2 className="mt-6 text-[17px] font-semibold text-ink">{p.infoTitle}</h2>
          <dl className="mt-3 divide-y divide-divider text-[14.5px]">
            {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>)}
          </dl>
        </div>
      </Reveal>

      <CtaBand locale={locale} />
    </div>
  );
}
