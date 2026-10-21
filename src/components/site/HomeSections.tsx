import Link from "next/link";
import { ArrowRight, Captions, Clock3, Languages, Palette, ShieldCheck, Smartphone, UserRound, Wallet, type LucideIcon } from "lucide-react";
import { solutionsMenu, integrationsMenu, type MenuItem } from "@/components/site/siteNav";
import { allPosts } from "@/lib/blog";
import { resolvedExamples } from "@/lib/examples";
import { BlogCard } from "@/components/site/BlogCard";
import { Marquee } from "@/components/site/Marquee";
import { MenuCard } from "@/components/site/MenuCard";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Button } from "@/components/ui/Button";

/** Server-rendered homepage sections that read content: examples marquee, use cases, integrations, blog cards, outcomes. */

export function ExampleMarquee() {
  const list = resolvedExamples();
  const items = list.length > 0
    ? list.map((e) => (
        <div key={e.id} className="relative aspect-[9/16] w-[150px] overflow-hidden rounded-tile bg-ink shadow-card">
          <video src={e.src} poster={e.posterSrc} muted loop playsInline autoPlay preload="metadata" aria-label={`${e.title}: ${e.note}`} className="size-full object-cover" />
          <span className="label-mono absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] text-ink">Made with Reelay</span>
        </div>
      ))
    : [];
  const placeholders = Array.from({ length: Math.max(0, 6 - items.length) }, (_, i) => (
    <div key={`ph-${i}`} className="grid aspect-[9/16] w-[150px] place-items-center rounded-tile border border-dashed border-border bg-surface-muted"><span className="label-mono text-muted">Sample coming soon</span></div>
  ));
  return <Marquee ariaLabel="Example videos" items={[...items, ...placeholders]} className="mt-10" />;
}

const outcomes: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Clock3, title: "Minutes of input, not days of production", text: "A photo, two sentences and a few choices. Script, product clip, presenter and edit run on their own while you do something else." },
  { icon: Wallet, title: "Costs visible before you start", text: "Credits and dollars on the form, one confirmation, the real amount on the project page afterwards." },
  { icon: Smartphone, title: "9:16, 1080p, ready for TikTok, Reels and Shorts", text: "Vertical by design. Download and post; nothing to crop or re-export." },
  { icon: Captions, title: "Captions of every spoken word", text: "The only text on screen, in a style you pick, with your accent colour on the word being said." },
  { icon: Languages, title: "190 languages for a video you own", text: "Several at once, each with its own captions, with an automatic check of every translated line." },
  { icon: UserRound, title: "Your voice and lips in the translation", text: "The speaker's own voice follows the new language and the lips match it, in Speed or Precision quality." },
  { icon: Palette, title: "Your brand style, saved once", text: "Accent colour, caption look, font and logo as defaults for every next video." },
  { icon: ShieldCheck, title: "Rights and data taken seriously", text: "Rights confirmed before any translation, files in private storage, signed links that expire, data per account." },
];

export function Outcomes() {
  return (
    <Reveal as="section">
      <SectionIntro eyebrow="What Reelay does for you" title="Concrete outcomes, nothing more" text="Only what the product does today." />
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {outcomes.map(({ icon: Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 60} className="rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent"><Icon className="size-5" aria-hidden /></span>
            <h3 className="mt-4 text-[17px] font-semibold leading-snug">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </ul>
    </Reveal>
  );
}

export function UseCaseCards() {
  return (
    <Reveal as="section">
      <SectionIntro eyebrow="Solutions" title="Who it is for" text="Six situations we built for. Each page shows the problem, how Reelay helps and an example flow." />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {solutionsMenu.map((c: MenuItem) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <MenuCard card={c} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function IntegrationsRow() {
  return (
    <Reveal as="section">
      <SectionIntro eyebrow="Integrations" title="From your code, your assistant, and soon your tools" />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {integrationsMenu.map((c: MenuItem) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <MenuCard card={c} />
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[13px] text-muted">API and MCP work today. Slack bot and Ad Launcher are announced, not built; their pages say so and only take a waitlist e-mail.</p>
    </Reveal>
  );
}

export function LatestPosts() {
  const posts = allPosts().slice(0, 3);
  if (posts.length === 0) return null;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow="From the blog" title="Practical reads" text="What we learn making short videos, written by the Reelay team." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
      </div>
      <div className="mt-8 text-center">
        <Button href="/blog" variant="secondary">All articles <ArrowRight className="size-4" aria-hidden /></Button>
      </div>
    </Reveal>
  );
}

export function MidCta() {
  return (
    <Reveal as="section" className="rounded-card bg-ink px-6 py-12 text-center text-surface sm:py-14">
      <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em]">Try it with your own product</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-surface/70">One free 10-second ad after you verify your e-mail. The estimate is on the form before anything starts.</p>
      <div className="mt-7 flex justify-center">
        <Button href="/signup" variant="accent" size="lg">Create your first ad free <ArrowRight className="size-5" aria-hidden /></Button>
      </div>
      <p className="mt-3 text-[13px] text-surface/60">No credit card required.</p>
      <p className="mt-6 text-[13px] text-surface/60"><Link href="/examples" className="underline decoration-surface/30 underline-offset-4 hover:decoration-surface">See the examples first</Link></p>
    </Reveal>
  );
}
