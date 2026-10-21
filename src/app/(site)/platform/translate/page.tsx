import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { firstExample } from "@/lib/examples";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { CtaBand } from "@/components/site/CtaBand";
import { RealOutput } from "@/components/site/RealOutput";
import { MidCta } from "@/components/site/HomeSections";
import { realTranslation } from "@/content/realOutput";
import { translateCredits } from "@/lib/plans";

export const metadata: Metadata = { title: "Translate videos", description: "A video you own, in other languages, with the speaker's own voice and matching lips." };

export default function PlatformTranslatePage() {
  const sample = firstExample("translate");
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">Translate videos</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">The same video, in every language you sell in</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">Upload a video you own. The speech is translated, the speaker&apos;s own voice and lip movements follow the new language, and captions are added. Several languages at once, each checked line by line.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">Start free <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href="/pricing" variant="secondary" size="lg">See pricing</Button>
          </div>
        </div>
        <PhoneFrame src={sample?.src} poster={sample?.posterSrc} words={["Hallo", "wereld"]} />
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow="How it works" title="Three steps, nothing waits for you" />
        <StepList
          className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card"
          columns={3}
          items={[
            { title: "Upload", text: "Your video is checked and stored safely, together with your rights confirmation." },
            { title: "Translate", text: "The speech is translated and every line is checked automatically against the original: missing words, numbers, names, natural phrasing." },
            { title: "Captions and 9:16", text: "Voice and lips are matched to the new language; captions and the vertical format are added. One file per language." },
          ]}
        />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Rights first" title="Only videos you own" text={config.rightsConfirmationText} />
        <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed text-muted">The voice and face in the video are cloned for the translation. You tick this confirmation before every translation; it is stored with the project, with a timestamp. Without it nothing starts.</p>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Quality and credits" title="Speed or Precision" text="Per minute of source video, per language." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold">Speed · {perMinute.speed} credits per minute</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Fast and affordable. Standard lip-sync and a straightforward translation. Good for one person talking straight into the camera with little movement.</p>
          </div>
          <div className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold">Precision · {perMinute.precision} credits per minute</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">The mouth is re-rendered for the new language, so the lip-sync looks noticeably more real. Better for faces that move, side angles and several speakers. Takes about twice as long.</p>
          </div>
        </div>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 text-[15px] text-ink/85 sm:grid-cols-2">
          {["190 languages and regional variants", "Several languages in one go", "Words to keep untranslated (brand names)", "Captions low or in the middle", "Silence at the start and end removed", "9:16 or the original size"].map((t) => (
            <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{t}</li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Examples" title="Translations made with Reelay" />
        <ExampleGallery kind="translate" limit={6} className="mt-10" />
      </Reveal>

      <RealOutput data={realTranslation} kind="translation" />

      <MidCta />

      <Reveal as="section"><CtaBand title="Translate your first video" text="Upload, confirm the rights, pick the languages. The estimate is shown before you start." /></Reveal>
    </div>
  );
}
