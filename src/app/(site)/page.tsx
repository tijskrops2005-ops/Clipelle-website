import type { Metadata } from "next";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { config } from "@/lib/config";
import { firstExample } from "@/lib/examples";
import { faq } from "@/content/faq";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Tabs } from "@/components/site/Tabs";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { PricingPreview } from "@/components/site/PricingPreview";
import { RealOutput } from "@/components/site/RealOutput";
import { SavingsCalculator } from "@/components/site/SavingsCalculator";
import { ExampleMarquee, IntegrationsRow, LatestPosts, MidCta, Outcomes, UseCaseCards } from "@/components/site/HomeSections";
import { realAd } from "@/content/realOutput";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "@/components/site/JsonLd";

export const metadata: Metadata = { title: `${config.productName} · Video ads from one product photo`, description: config.tagline, alternates: { canonical: absoluteUrl("/") } };

const steps = [
  { title: "Add your product", text: "A photo and a short description, or a product link that fills the form for you. Or upload a video you own to translate it." },
  { title: "One click", text: "Script, product clip, presenter and edit run on their own. You follow the steps on one page." },
  { title: "Download", text: "A finished 9:16 ad with captions, ready for TikTok, Reels and Shorts." },
];

export default function HomePage() {
  const heroSample = firstExample("ad");
  const translateSample = firstExample("translate");
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: config.productName, url: absoluteUrl("/"), logo: absoluteUrl("/opengraph-image") }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: config.productName, url: absoluteUrl("/") }} />
      {/* Hero */}
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">Video ads, made automatically</p>
          <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">From one product photo to a finished ad</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">Add a product once. A script is written, a presenter speaks it, your product is animated and everything is cut into one 9:16 ad with captions. Or translate a video you own into other languages.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">
              <Sparkles className="size-5" aria-hidden />
              Create your first ad free
            </Button>
            <Button href="/examples" variant="secondary" size="lg">
              See examples
              <ArrowRight className="size-5" aria-hidden />
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">No credit card required. One free 10-second ad after you verify your e-mail.</p>
        </div>
        <PhoneFrame src={heroSample?.src} poster={heroSample?.posterSrc} />
      </section>

      {/* What you can make */}
      <Reveal as="section">
        <SectionIntro eyebrow="What you can make" title="Make an ad from a photo, from a link, or translate a video" text="No editor, no timeline: one form and one button." />
        <Tabs
          className="mt-10"
          tabs={[
            {
              key: "ads",
              label: "Ads from a photo",
              content: (
                <div className="grid items-center gap-10 rounded-card bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="text-title">A presenter, your product, captions</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">The script is written from your description with a spoken hook, three benefits and a call to action. A presenter you pick speaks it in the language and voice you choose; your product photo becomes a short clip laid over the presenter at fixed moments.</p>
                    <ul className="mt-5 space-y-2 text-[15px] text-ink/85">
                      {["10 to 60 seconds, always 9:16", "Standard or Premium presenter, price shown per length", "Review the script first if you want to"].map((t) => (
                        <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{t}</li>
                      ))}
                    </ul>
                    <Button href="/platform/ads" variant="link" className="mt-5">How ads are made <ArrowRight className="size-4" aria-hidden /></Button>
                  </div>
                  <PhoneFrame src={heroSample?.src} float={false} className="w-[200px]" />
                </div>
              ),
            },
            {
              key: "url",
              label: "Ads from a link",
              content: (
                <div className="grid items-center gap-10 rounded-card bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="text-title">Paste a product link, check the facts, get the ad</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">The name, description, photos and price are read from your product page. You correct what you want and tick the photos you own; then the same ad form opens prefilled. Nothing is sent to an AI and nothing is copied before you confirm.</p>
                    <ul className="mt-5 space-y-2 text-[15px] text-ink/85">
                      {["Works with public product pages that carry product data", "Only use products and photos you own or have the rights to use", "The same lengths, presenters and brand style as from a photo"].map((t) => (
                        <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{t}</li>
                      ))}
                    </ul>
                    <Button href="/platform/url-to-video" variant="link" className="mt-5">How URL to video works <ArrowRight className="size-4" aria-hidden /></Button>
                  </div>
                  <div className="w-[220px] rounded-card bg-bg p-4 shadow-card" aria-hidden>
                    <div className="rounded-control border border-border bg-surface px-3 py-2 text-[11px] text-muted">https://yourshop.com/…</div>
                    <div className="mt-3 h-2.5 w-3/4 rounded-full bg-ink/80" />
                    <div className="mt-2 h-2 w-full rounded-full bg-ink/15" />
                    <div className="mt-1.5 h-2 w-5/6 rounded-full bg-ink/15" />
                    <div className="mt-3 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className={`aspect-square rounded-[6px] bg-surface-muted ${i < 2 ? "ring-2 ring-accent" : ""}`} />)}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "translate",
              label: "Translate a video",
              content: (
                <div className="grid items-center gap-10 rounded-card bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="text-title">The same video, another language</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">Upload a video you own. The speech is translated, the speaker&apos;s own voice and lip movements follow the new language, every line is checked against the original, and captions are added in 9:16 or the original size.</p>
                    <ul className="mt-5 space-y-2 text-[15px] text-ink/85">
                      {["190 languages and regional variants", "Speed or Precision quality, price per minute", "Rights confirmed before anything starts"].map((t) => (
                        <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{t}</li>
                      ))}
                    </ul>
                    <Button href="/platform/translate" variant="link" className="mt-5">How translation works <ArrowRight className="size-4" aria-hidden /></Button>
                  </div>
                  <PhoneFrame src={translateSample?.src} poster={translateSample?.posterSrc} float={false} className="w-[200px]" words={["Hallo", "wereld"]} />
                </div>
              ),
            },
          ]}
        />
      </Reveal>

      {/* How it works */}
      <Reveal as="section" className="scroll-mt-24">
        <SectionIntro eyebrow="How it works" title="Three things on your side" text="Everything in between runs on its own." />
        <StepList items={steps} columns={3} className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" />
      </Reveal>

      {/* Examples marquee */}
      <Reveal as="section">
        <SectionIntro eyebrow="Examples" title="Made with Reelay" text="Our own finished videos. Nothing here comes from anywhere else." />
        <ExampleMarquee />
        <div className="mt-8 text-center">
          <Button href="/examples" variant="secondary">All examples <ArrowRight className="size-4" aria-hidden /></Button>
        </div>
      </Reveal>

      <RealOutput data={realAd} kind="ad" />

      <MidCta />

      <Outcomes />

      <UseCaseCards />

      <IntegrationsRow />

      {/* Reelay vs doing it yourself */}
      <Reveal as="section">
        <SectionIntro eyebrow="Compare" title="Reelay vs doing it yourself" text="Type what a video costs you now and how many you make. The right column uses our plan prices and our measured times, nothing else." />
        <div className="mt-10"><SavingsCalculator compact /></div>
      </Reveal>

      <TrustBlocks />

      {/* Pricing preview */}
      <Reveal as="section">
        <SectionIntro eyebrow="Pricing" title="Plans that grow with you" text="Every plan includes credits. One credit is one second of Standard presenter video." />
        <PricingPreview className="mt-10" />
      </Reveal>

      {/* FAQ */}
      <Reveal as="section">
        <SectionIntro eyebrow="FAQ" title="Questions" />
        <Accordion items={faq.slice(0, 6)} className="mx-auto mt-10 max-w-3xl" />
        <p className="mt-6 text-center text-[15px] text-muted"><a href="/resources/faq" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">All questions</a></p>
      </Reveal>

      <LatestPosts />

      <Reveal as="section">
        <CtaBand />
      </Reveal>

      <p className="flex items-center justify-center gap-2 text-[13px] text-muted"><Clock3 className="size-4" aria-hidden /> A typical ad is ready in a few minutes.</p>
    </div>
  );
}
