import { ArrowRight } from "lucide-react";
import { firstExample } from "@/lib/examples";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { realAd } from "@/content/realOutput";
import { cachedAdCreditTable } from "@/lib/pricingCached";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { AdSketch, HeroStage } from "@/components/site/Sketches";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { CtaBand } from "@/components/site/CtaBand";
import { RealOutput } from "@/components/site/RealOutput";
import { MidCta } from "@/components/site/HomeSections";

export async function PlatformAdsPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.platformAds;
  const L = (x: string) => localizePath(x, locale);
  const sample = firstExample("ad");
  const table = await cachedAdCreditTable();
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">{p.eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{p.title}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">{p.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">{t.common.createFirstAd} <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href={L("/pricing")} variant="secondary" size="lg">{t.common.seePricing}</Button>
          </div>
          <p className="mt-3 text-[13px] text-muted">{t.common.noCard}</p>
        </div>
        <HeroStage label={t.common.illustration}>
          {sample ? <PhoneFrame src={sample.src} poster={sample.posterSrc} caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} /> : <div className="float-soft w-[240px] sm:w-[260px]"><AdSketch label={t.common.illustration} /></div>}
        </HeroStage>
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={p.stepsTitle} text={p.stepsText} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={4} items={p.steps} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.choicesEyebrow} title={p.choicesTitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">{p.youChoose}</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{p.youChooseItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul>
          </div>
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">{p.doneForYou}</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{p.doneForYouItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{x}</li>)}</ul>
          </div>
        </div>
        <p className="mt-6 text-center text-[15px] text-muted">{p.captionsOnly}</p>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.creditsEyebrow} title={p.creditsTitle} text={p.creditsText} />
        <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">{p.length}</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {table.map((r) => <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits</td><td className="px-5 py-3">{r.premium} credits</td></tr>)}
            </tbody>
          </table>
        </div>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={t.home.examplesEyebrow} title={p.examplesTitle} />
        <ExampleGallery kind="ad" limit={6} className="mt-10" locale={locale} />
      </Reveal>
      <RealOutput data={realAd} kind="ad" locale={locale} />
      <MidCta locale={locale} />
      <Reveal as="section"><CtaBand locale={locale} /></Reveal>
    </div>
  );
}
