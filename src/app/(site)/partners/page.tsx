import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";
import { partners } from "@/content/partners";
import { PLANS, formatPrice } from "@/lib/plans";
import { absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { JsonLd } from "@/components/site/JsonLd";

export const metadata: Metadata = { title: "Partner program", description: "Recommend Reelay and earn 25% of the subscription payments of every customer you refer, for as long as they stay subscribed.", alternates: { canonical: absoluteUrl("/partners") } };

const pct = partners.commissionPercent;
const faq = [
  { q: "How much do I earn?", a: `${pct}% of the subscription payments of every customer you referred, for as long as that customer keeps a subscription.` },
  { q: "Do credit packs count?", a: "No. Separately purchased credit packs do not earn commission; subscription payments do." },
  { q: "When am I paid?", a: `Monthly, once your balance is at least ${formatPrice(partners.minimumPayoutUsd)}. Smaller balances carry over to the next month.` },
  { q: "How long does a referral last?", a: "As long as the referred customer keeps a subscription." },
  { q: "How is it paid?", a: `Through the external partner platform the program runs on (${partners.platformName}). You manage your details and payout method there.` },
  { q: "Where are the full terms?", a: "On the partner terms page, linked in the footer. It is a draft until the review is done; the commission rules above will not change." },
];

/** Partner program: explanation, how it works, benefits, a worked example from plans.ts, FAQ, and the join button once the link exists. */
export default function PartnersPage() {
  const pro = PLANS.find((p) => p.key === "pro")!;
  const starter = PLANS.find((p) => p.key === "starter")!;
  const open = Boolean(partners.signupUrl);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="pt-16 sm:pt-24">
        <p className="label-mono text-muted">Partner program</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">Recommend Reelay, earn {pct}% of every subscription you bring</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">For agencies, creators, consultants and shop owners who know people that make product videos. You share your link; when someone subscribes, you receive {pct}% of their subscription payments for as long as they stay a subscriber.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {open ? (
            <Button href={partners.signupUrl} variant="accent" size="lg">Join the partner program <ArrowRight className="size-5" aria-hidden /></Button>
          ) : (
            <>
              <Badge tone="warning">Partner program opens soon</Badge>
              <Link href="/contact" className="focus-ring rounded-control text-[15px] underline decoration-border underline-offset-4 hover:decoration-ink">Tell us you are interested</Link>
            </>
          )}
        </div>
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow="How it works" title="Three steps" />
        <StepList
          className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card"
          columns={3}
          items={[
            { title: "Apply", text: `Sign up on the partner platform (${partners.platformName}). After approval you get a personal link.` },
            { title: "Share", text: "Put the link where your audience is: a review, a tutorial, a newsletter, a client proposal." },
            { title: "Earn", text: `${pct}% of each subscription payment of the customers who signed up through your link, paid monthly from ${formatPrice(partners.minimumPayoutUsd)}.` },
          ]}
        />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Benefits" title="What you get" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: `${pct}% recurring`, text: "On subscription payments, for as long as the customer keeps a subscription." },
            { title: "Monthly payout", text: `Paid every month once your balance reaches ${formatPrice(partners.minimumPayoutUsd)}.` },
            { title: "A product you can show", text: "Every example on this site is real output; your audience can make one free ad and see for themselves." },
            { title: "Clear rules", text: "The terms are short and public; no commission on credit packs, nothing hidden." },
          ].map((b) => (
            <li key={b.title} className="rounded-card bg-surface p-6 shadow-card">
              <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Handshake className="size-4" aria-hidden /></span>
              <p className="mt-4 text-[17px] font-semibold text-ink">{b.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Example" title="What a referral is worth" text="An illustration with today's plan prices, not a promise: what a customer pays depends on the plan they choose and how long they stay." />
        <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">Referred customer on</th><th className="px-5 py-3 font-medium">Pays per month</th><th className="px-5 py-3 font-medium">Your {pct}% per month</th><th className="px-5 py-3 font-medium">Over 12 months</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {[starter, pro].map((p) => (
                <tr key={p.key}><td className="px-5 py-3 font-medium text-ink">{p.name}</td><td className="px-5 py-3">{formatPrice(p.monthlyUsd)}</td><td className="px-5 py-3">{formatPrice(Math.round(p.monthlyUsd * pct) / 100)}</td><td className="px-5 py-3">{formatPrice(Math.round(p.monthlyUsd * pct * 12) / 100)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[13px] text-muted">Monthly prices from the pricing page; credit packs are not included because they earn no commission.</p>
        </div>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="FAQ" title="Partner questions" />
        <Accordion items={faq} className="mx-auto mt-10 max-w-3xl" />
        <p className="mt-6 text-center text-[13px] text-muted">Full terms: <Link href="/legal/affiliate-terms" className="underline">partner program terms</Link>.</p>
      </Reveal>

      <Reveal as="section" className="rounded-card bg-surface px-6 py-14 text-center shadow-card">
        <h2 className="text-display">Ready to recommend Reelay?</h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {open ? (
            <Button href={partners.signupUrl} variant="accent" size="lg">Join the partner program <ArrowRight className="size-5" aria-hidden /></Button>
          ) : (
            <>
              <Badge tone="warning">Partner program opens soon</Badge>
              <Button href="/contact" variant="secondary" size="lg">Contact us</Button>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
