import { ArrowRight } from "lucide-react";
import { services } from "@/content/services";
import { Button } from "@/components/ui/Button";
import { SectionIntro } from "@/components/site/SectionIntro";

/** "Winning ads, made for you": the managed service. Numbers and times only from src/content/services.ts; no price. */
export function ServiceSection({ compact }: { compact?: boolean }) {
  const facts = [services.volumeRange && { label: "Volume", value: services.volumeRange }, services.turnaround && { label: "Turnaround", value: services.turnaround }].filter(Boolean) as { label: string; value: string }[];
  return (
    <section className="rounded-card bg-ink px-6 py-12 text-surface sm:px-10 sm:py-14">
      <SectionIntro eyebrow="Managed service" title="Winning ads, made for you" text="You send the products; we run Reelay for you, pick the hooks, check every script and deliver finished ads. For brands that want the output without the hands-on time." className="[&_h2]:text-surface [&_p]:text-surface/70 [&_.label-mono]:text-surface/60" />
      {(facts.length > 0 || services.features.length > 0) && (
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-[14px] bg-white/5 p-4"><p className="label-mono text-surface/60">{f.label}</p><p className="mt-1 text-[17px] font-semibold">{f.value}</p></div>
          ))}
          {services.features.length > 0 && (
            <ul className="rounded-[14px] bg-white/5 p-4 text-[15px] sm:col-span-2">{services.features.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>)}</ul>
          )}
        </div>
      )}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/demo" variant="accent" size="lg">Book a demo <ArrowRight className="size-5" aria-hidden /></Button>
        {!compact && <Button href="/services/done-for-you" variant="secondary" size="lg">How the service works</Button>}
      </div>
      <p className="mt-4 text-center text-[13px] text-surface/60">Scope and pricing are agreed per brand on a call. Nothing here is a fixed offer.</p>
    </section>
  );
}
