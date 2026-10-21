import type { Metadata } from "next";
import { config } from "@/lib/config";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CtaBand } from "@/components/site/CtaBand";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "About" };

const values = [
  { title: "The process is the product", text: "We do not build a video editor or a new AI model. We run one proven ad-production process from start to finish, with services that can be swapped behind it." },
  { title: "Honest numbers", text: "The estimate is on the form before you start and the real amount is on the project page afterwards. Credits mean one thing: seconds of video." },
  { title: "Nothing on screen but captions", text: "Hook, benefits and call to action are spoken. The picture stays calm: the presenter, your product, your logo if you want it." },
  { title: "Rights come first", text: "A video is only translated when you confirm you own it and have the speaker's permission. We never build around that." },
];

export default function AboutPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow="About" title={`Why ${config.productName} exists`} text="A small team around one founder who sells products online and got tired of making the same ad in six tools." />

      <section className="mx-auto max-w-2xl space-y-5 text-[17px] leading-relaxed text-ink/90">
        <p>Making a short product ad used to mean writing a script, generating product footage in one tool, a presenter in another, cutting everything together in a third, adding captions, exporting, and doing it all again for the next product or language. The steps never changed; only the product did.</p>
        <p>{config.productName} runs those steps as one process. You add a product once, pick a few things that matter (length, presenter, voice, brand style), and the rest happens on its own. For a video you already have, the same idea gives you the video in other languages with the speaker&apos;s own voice.</p>
        <p>The services behind each step are replaceable and never shown to you by name. What stays the same is the order, the checks, the cost shown up front and the file you can download at the end.</p>
      </section>

      <section>
        <SectionIntro eyebrow="What we stand for" title="Four rules we keep" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <li key={v.title} className="rounded-card bg-surface p-6 shadow-card">
              <p className="text-[17px] font-semibold text-ink">{v.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card bg-surface p-8 text-center shadow-card">
        <h2 className="text-title">Talk to us</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">Questions, a larger volume, or a feature you miss: book a demo or send a message.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/demo" variant="primary">Book a demo</Button>
          <Button href="/contact" variant="secondary">Contact</Button>
        </div>
      </section>

      <CtaBand />
    </div>
  );
}
