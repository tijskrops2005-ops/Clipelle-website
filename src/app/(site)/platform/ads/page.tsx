import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { firstExample } from "@/lib/examples";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { CtaBand } from "@/components/site/CtaBand";
import { RealOutput } from "@/components/site/RealOutput";
import { MidCta } from "@/components/site/HomeSections";
import { realAd } from "@/content/realOutput";
import { adCreditTable } from "@/lib/plans";

export const metadata: Metadata = { title: "Image to video", description: "From one product photo to a finished 9:16 ad with a presenter and captions." };

export default function PlatformAdsPage() {
  const sample = firstExample("ad");
  const table = adCreditTable();
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">Image to video</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">A presenter, your product, captions. One form.</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">Upload a product photo, describe the product in a few sentences, pick a presenter and a length. The script, the product footage, the presenter video and the edit are made for you.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">Create your first ad free <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href="/pricing" variant="secondary" size="lg">See pricing</Button>
          </div>
        </div>
        <PhoneFrame src={sample?.src} poster={sample?.posterSrc} />
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow="How it works" title="Four steps, one click" text="You follow them on one page; the finished ad lands on your dashboard." />
        <StepList
          className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card"
          columns={4}
          items={[
            { title: "Script", text: "A spoken hook, three benefits and a call to action, written from your description. Review it first if you want." },
            { title: "Product clip", text: "Your product photo becomes a short clip that shows the product in motion." },
            { title: "AI presenter", text: "A presenter you pick speaks the script in the language, accent and voice you choose." },
            { title: "Final edit", text: "One 9:16 ad: the presenter as the base, the product clip at fixed moments, captions of what is said." },
          ]}
        />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Choices" title="What you decide, what is done for you" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">You choose</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">
              {["Length: 10, 20, 30, 45 or 60 seconds", "Presenter quality: Standard (recommended) or Premium", "Presenter, language, accent, voice and speaking speed", "Tone, an offer for the call to action, a direction", "Background colour or your own image behind the presenter", "Brand style: accent colour, caption look, font, logo", "Your own script, or review the written one first"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">Done for you</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">
              {["The script, within a hard word limit for your length", "Product footage from the photo, with varied slow camera moves", "Lip-sync and pacing of the presenter", "The edit: timing, fades, captions, 1080p 9:16 export", "Copying every result to your own storage", "Showing the real amount spent next to the estimate"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-center text-[15px] text-muted">The only text on screen is the captions of what the presenter says. No text cards, no buttons, no end cards.</p>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Credits" title="What an ad costs" text="One credit is one second of Standard presenter video. The form shows the same number before you start." />
        <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-surface-muted text-[13px] text-muted">
              <tr><th className="px-5 py-3 font-medium">Length</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {table.map((r) => (
                <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits</td><td className="px-5 py-3">{r.premium} credits</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Examples" title="Ads made with Reelay" />
        <ExampleGallery kind="ad" limit={6} className="mt-10" />
      </Reveal>

      <RealOutput data={realAd} kind="ad" />

      <MidCta />

      <Reveal as="section"><CtaBand /></Reveal>
    </div>
  );
}
