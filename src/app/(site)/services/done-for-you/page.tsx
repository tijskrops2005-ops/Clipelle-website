import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { services } from "@/content/services";
import { absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ServiceRequestForm } from "@/components/site/ServiceRequestForm";

export const metadata: Metadata = { title: "Winning ads, made for you", description: "A managed service: you send the products, we run Reelay for you and deliver finished ads. Scope agreed on a call.", alternates: { canonical: absoluteUrl("/services/done-for-you") } };

export default function DoneForYouPage() {
  const facts = [services.volumeRange && { label: "Volume", value: services.volumeRange }, services.turnaround && { label: "Turnaround", value: services.turnaround }].filter(Boolean) as { label: string; value: string }[];
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="pt-16 sm:pt-24">
        <p className="label-mono text-muted">Managed service</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">Winning ads, made for you</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">The same Reelay, with our hands on it: we take your products and brand style, write and check the scripts, choose the hooks, make the ads and deliver them ready to post. For brands that want the result without the time.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/demo" variant="accent" size="lg">Book a demo <ArrowRight className="size-5" aria-hidden /></Button>
          <Button href="#request" variant="secondary" size="lg">Request a call</Button>
        </div>
        <p className="mt-3 text-[13px] text-muted">Scope and pricing are agreed per brand. No fixed offer, no numbers we have not agreed.</p>
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow="How it works" title="Four steps" />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={4} items={[
          { title: "A call", text: "What you sell, where, to whom, and what the ads must do. We say honestly whether Reelay fits." },
          { title: "Products and style", text: "You share product pages or photos and your brand style once; we set them up in a workspace for you." },
          { title: "We make the ads", text: "Scripts reviewed by a person, hooks chosen, presenter and voice fixed, every video checked before delivery." },
          { title: "You post", text: "Finished 9:16 ads with captions in your workspace, ready to download; you run the campaigns." },
        ]} />
      </Reveal>

      {(facts.length > 0 || services.features.length > 0) && (
        <Reveal as="section">
          <SectionIntro eyebrow="What is included" title="The agreed scope" />
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {facts.map((f) => <div key={f.label} className="rounded-card bg-surface p-5 shadow-card"><p className="label-mono text-muted">{f.label}</p><p className="mt-1 text-[17px] font-semibold text-ink">{f.value}</p></div>)}
            {services.features.length > 0 && <ul className="rounded-card bg-surface p-5 shadow-card text-[15px] text-ink/85 sm:col-span-2">{services.features.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>)}</ul>}
          </div>
        </Reveal>
      )}

      <Reveal as="section" className="grid gap-5 md:grid-cols-2">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">What we do</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{["Set up your products and brand style in Reelay", "Write, review and approve the spoken scripts", "Choose hooks, presenter, voice and length per product", "Check every finished video before you see it", "Deliver in your own workspace, with the costs visible"].map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{t}</li>)}</ul>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">What we do not do</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{["Run or optimise your ad campaigns", "Promise results, views or sales", "Use products or photos you do not own", "Add anything to the videos that Reelay does not make (no music, no text cards)"].map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>)}</ul>
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h2 id="request" className="text-title scroll-mt-28">Request a call</h2>
        <p className="mb-6 mt-2 text-[15px] text-muted">Tell us what you sell and how many ads you need. We reply by e-mail within two working days.</p>
        <ServiceRequestForm />
      </Reveal>
    </div>
  );
}
