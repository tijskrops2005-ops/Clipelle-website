import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Captions, Clock3, Languages, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";

export const metadata: Metadata = { title: "Welcome", description: config.tagline };

/**
 * Static landing page outside the app shell: what the product does, in our own words.
 * No form, no data, no provider names. The app itself starts at /dashboard.
 */

const steps = [
  { title: "Add your product", text: "A few photos and a short description. Or upload a video you own to translate it." },
  { title: "One click", text: "Script, product clip, presenter and edit run on their own. You follow the steps on one page." },
  { title: "Download", text: "A finished 9:16 ad with captions, ready for TikTok, Reels and Shorts." },
];

const includes = [
  { icon: Sparkles, title: "Script written for you", text: "Hook, benefits and call to action, all spoken by the presenter." },
  { icon: UserRound, title: "AI presenter", text: "Pick a presenter and a voice; the lip-sync and pace are handled for you." },
  { icon: Captions, title: "Captions included", text: "Captions of what is said are the only thing placed on screen." },
  { icon: Languages, title: "Translate a video", text: "The same video in other languages, with the speaker's own voice and matching lips." },
  { icon: Clock3, title: "Minutes, not days", text: "A typical ad is ready in a few minutes; you can leave the page while it runs." },
  { icon: ShieldCheck, title: "Costs shown upfront", text: "Every video shows its estimate before the start and the real amount afterwards." },
];

const faq = [
  { q: "What do I need to start?", a: "One product photo and two or three sentences about the product. The script, the presenter and the edit are made for you." },
  { q: "Can I use my own script?", a: "Yes. Paste it in the script field, or tick \"Review script first\" to approve the written script before anything else starts." },
  { q: "What is placed on screen?", a: "Only captions of what the presenter says, in the caption style you choose, plus your logo if you add one. No text cards, no buttons." },
  { q: "Which videos can I translate?", a: "Videos you own, with the speaker's permission to use their voice and face. You confirm this before every translation." },
  { q: "What does a video cost?", a: "The form shows an estimate for your choices before you start, and the project page shows what was really spent." },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Floating rounded navigation bar */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-surface px-3 shadow-card">
          <Link href="/welcome" className="focus-ring ml-1 flex items-center gap-2.5 rounded-control">
            <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface">
              {config.productName.charAt(0)}
            </span>
            <span className="text-[17px] font-semibold tracking-tight">{config.productName}</span>
          </Link>
          <nav aria-label="Landing" className="hidden items-center gap-1 sm:flex">
            <a href="#how" className="focus-ring rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">How it works</a>
            <a href="#includes" className="focus-ring rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">What you get</a>
            <a href="#faq" className="focus-ring rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">FAQ</a>
          </nav>
          <Button href="/dashboard" variant="primary" size="md" className="rounded-full">
            Open the app
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-20 text-center sm:pt-28">
          <p className="label-mono text-muted">Video ads, made automatically</p>
          <h1 className="mt-5 text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]">From one product photo to a finished ad</h1>
          <p className="mx-auto mt-6 max-w-xl text-subtitle text-muted">
            Add a product once. A script is written, a presenter speaks it, your product is animated and everything is cut into one 9:16 ad with captions.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/new/ad" variant="accent" size="lg">
              <Sparkles className="size-5" aria-hidden />
              Make an ad
            </Button>
            <Button href="/new/translate" variant="secondary" size="lg">
              <Languages className="size-5" aria-hidden />
              Translate a video
            </Button>
          </div>
        </section>

        {/* Three numbered steps */}
        <section id="how" className="mt-24 scroll-mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-display">How it works</h2>
            <p className="mt-3 text-subtitle text-muted">Three things on your side. Everything in between runs on its own.</p>
          </div>
          <StepList items={steps} columns={3} className="mt-10 [&>li]:bg-surface [&>li]:shadow-card [&>li]:px-6 [&>li]:py-6" />
        </section>

        {/* What you get */}
        <section id="includes" className="mt-24 scroll-mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-display">What you get</h2>
            <p className="mt-3 text-subtitle text-muted">Everything a short product ad needs, and nothing that clutters it.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {includes.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-card bg-surface p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-24 scroll-mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-display">Questions</h2>
          </div>
          <dl className="mx-auto mt-10 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
            {faq.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-[17px] font-semibold">{q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing call */}
        <section className="mt-24 rounded-card bg-surface px-6 py-14 text-center shadow-card sm:mt-32">
          <h2 className="text-display">Make your first ad</h2>
          <p className="mx-auto mt-3 max-w-md text-subtitle text-muted">The estimate is shown before you start. Nothing is charged until you confirm.</p>
          <Button href="/new" variant="accent" size="lg" className="mt-8">
            Create new video
            <ArrowRight className="size-5" aria-hidden />
          </Button>
        </section>
      </main>

      <footer className="border-t border-divider px-6 py-8 text-center">
        <p className="label-mono text-muted">{config.productName} · {config.tagline}</p>
      </footer>
    </div>
  );
}
