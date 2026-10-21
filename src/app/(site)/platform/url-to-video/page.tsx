import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CtaBand } from "@/components/site/CtaBand";
import { Accordion } from "@/components/site/Accordion";

export const metadata: Metadata = { title: "URL to video", description: "Paste a product link; name, description and photos are read from the page, you check them, and the ad is made." };

const faq = [
  { q: "Which pages work?", a: "Public product pages with product data, sharing tags or at least a title and photos. Most shop platforms publish product data, so the fields are usually filled in. Pages behind a login cannot be read." },
  { q: "Is anything used without my confirmation?", a: "No. The page is read once, the result is shown to you, and photos are copied only after you confirm. The video is made from what you leave in the form." },
  { q: "Does an AI read the page?", a: "No. The page's own product data and tags are read by plain code. The script is written later, from the description you approved, as in every ad." },
  { q: "What about rights?", a: "Only use products and photos you own or have the rights to use. The form asks you to confirm before anything starts." },
];

export default function PlatformUrlPage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">URL to video</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">Paste a product link. Check the facts. Get the ad.</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">The product name, description, photos and price are read from your own product page, so the form starts filled in. You correct what you want, pick the photos you own, and the rest is the same ad as always: a presenter, product footage and captions in 9:16.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">Create your first ad free <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href="/platform/ads" variant="secondary" size="lg">How the ad is made</Button>
          </div>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card" aria-hidden>
          <div className="rounded-control border border-border bg-bg px-4 py-3 text-[13px] text-muted">https://yourshop.com/products/…</div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-2/3 rounded-full bg-ink/80" />
            <div className="h-2.5 w-full rounded-full bg-ink/15" />
            <div className="h-2.5 w-5/6 rounded-full bg-ink/15" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`aspect-square rounded-tile bg-surface-muted ${i < 2 ? "ring-2 ring-accent" : ""}`} />
              ))}
            </div>
          </div>
          <div className="mt-5 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-white">Use these details</div>
        </div>
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow="How it works" title="Three checks, then the usual four steps" />
        <StepList
          className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card"
          columns={3}
          items={[
            { title: "Paste the link", text: "A public product page. We read its product data, sharing tags, title and photos. No login, no private addresses, no AI." },
            { title: "Check and choose", text: "Name and description are editable; photos are ticked by you. Nothing is copied before you confirm." },
            { title: "The same ad form", text: "Everything lands in the normal form: length, presenter, voice, brand style. Then script, product clip, presenter and edit run on their own." },
          ]}
        />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="Safety" title="What the page reader does and does not do" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">It does</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">
              {["Read one public page per request, up to 2 MB, within a few seconds", "Use the page's product data, sharing tags, title and large photos", "Show you everything before it is used", "Copy only the photos you ticked"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">It does not</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">
              {["Log in anywhere or send cookies", "Reach private or internal addresses", "Follow endless redirects", "Send the page to an AI", "Start a video by itself"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow="FAQ" title="About reading product pages" />
        <Accordion items={faq} className="mx-auto mt-10 max-w-3xl" />
      </Reveal>

      <Reveal as="section"><CtaBand /></Reveal>
    </div>
  );
}
