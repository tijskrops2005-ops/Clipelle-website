import { ArrowRight } from "lucide-react";
import { firstExample } from "@/lib/examples";
import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { realTranslation } from "@/content/realOutput";
import { translateCredits } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { HeroStage, TranslateSketch } from "@/components/site/Sketches";
import { SectionIntro } from "@/components/site/SectionIntro";
import { FinalCta } from "@/components/site/Persuasion";
import { RealOutput } from "@/components/site/RealOutput";
import { LatestPosts } from "@/components/site/HomeSections";

export function PlatformTranslatePage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.platformTranslate;
  const L = (x: string) => localizePath(x, locale);
  const sample = firstExample("translate");
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">{p.eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{p.title}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">{p.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">{t.common.startFree} <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href={L("/pricing")} variant="secondary" size="lg">{t.common.seePricing}</Button>
          </div>
          <p className="mt-3 text-[13px] text-muted">{t.common.noCard}</p>
        </div>
        <HeroStage variant="translate" label={t.common.illustration}>
          {sample ? <PhoneFrame src={sample.src} poster={sample.posterSrc} caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} /> : <div className="float-soft"><TranslateSketch label={t.common.illustration} className="w-[260px]" /></div>}
        </HeroStage>
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={p.stepsTitle} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={3} items={p.steps} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.rightsEyebrow} title={p.rightsTitle} text={config.rightsConfirmationText} />
        <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed text-muted">{p.rightsText}</p>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.qualityEyebrow} title={p.qualityTitle} text={p.qualityText} />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold">Speed · {perMinute.speed} {p.creditsPerMinute}</p><p className="mt-2 text-[15px] leading-relaxed text-muted">{p.speedText}</p></div>
          <div className="rounded-card bg-surface p-6 shadow-card"><p className="text-[17px] font-semibold">Precision · {perMinute.precision} {p.creditsPerMinute}</p><p className="mt-2 text-[15px] leading-relaxed text-muted">{p.precisionText}</p></div>
        </div>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 text-[15px] text-ink/85 sm:grid-cols-2">{p.features.map((x) => <li key={x} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul>
      </Reveal>
      <RealOutput data={realTranslation} kind="translation" locale={locale} />
      <LatestPosts locale={locale} categories={["translation"]} />
      <FinalCta locale={locale} />
    </div>
  );
}
