import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { viaLogin } from "@/components/site/siteNav";
import { resolveExampleFile } from "@/lib/examples";
import { toolPages, type ToolPage } from "@/content/toolPages";
import { cn } from "@/lib/utils";

/**
 * A public tool page (25 Nov 2026, after vmake.ai's tool pages, our own words and output): what it does,
 * a real before and after when one is made, three steps, the facts, questions, the other tools.
 */
export function ToolLandingPage({ page }: { page: ToolPage }) {
  const ex = page.example?.ready ? page.example : undefined;
  const before = ex ? resolveExampleFile(ex.before) : null;
  const after = ex ? resolveExampleFile(ex.after) : null;
  const others = toolPages.filter((p) => p.slug !== page.slug);
  return (
    <div className="space-y-20 sm:space-y-28">
      <PageHero
        title={page.title}
        text={page.intro}
        actions={
          <>
            <Button href={viaLogin(page.appHref)} variant="accent" size="lg">Try it free</Button>
            <Button href="/pricing" variant="secondary" size="lg">See pricing</Button>
          </>
        }
        note="No credit card. 30 free credits."
      />

      {ex && before && after && (
        <section aria-label="Before and after" className="stage-panel relative overflow-hidden rounded-card px-4 py-10 shadow-card sm:px-10 sm:py-14">
          <div className="relative mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
            {[{ src: before, label: ex.beforeLabel ?? "Before" }, { src: after, label: ex.afterLabel ?? "After" }].map((m, i) => (
              <figure key={m.label} className="text-center">
                <div className={cn("relative mx-auto overflow-hidden rounded-[22px] border-[5px] border-ink shadow-card-hover", ex.media === "video" ? "aspect-[9/16] w-full max-w-[280px] bg-ink" : "w-full max-w-[320px]", i === 1 && ex.transparent && "checkerboard")}>
                  {ex.media === "video" ? (
                    <video src={m.src} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" aria-label={m.label} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.src} alt={m.label} className="block w-full" loading="lazy" />
                  )}
                </div>
                <figcaption className={cn("mt-3 inline-block rounded-full px-3 py-1 text-[13px] font-medium", i === 1 ? "bg-accent text-white" : "bg-surface text-ink shadow-soft")}>{m.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="relative mt-6 text-center text-[13px] text-muted">Made with Clipelle on our own sample.</p>
        </section>
      )}

      <section aria-labelledby="how" className="mx-auto max-w-4xl">
        <h2 id="how" className="text-center text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em]">How it works</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {page.steps.map((s, i) => (
            <li key={s} className="rounded-card bg-surface p-6 shadow-card">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-[14px] font-semibold text-white">{i + 1}</span>
              <p className="mt-4 text-[16px] font-medium text-ink">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="facts" className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
        <div>
          <h2 id="facts" className="text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold tracking-[-0.02em]">The facts</h2>
          <ul className="mt-5 space-y-3">
            {page.facts.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15.5px] text-ink/85"><Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold tracking-[-0.02em]">Questions</h2>
          <Accordion items={page.faq} className="mt-5" />
        </div>
      </section>

      <section aria-labelledby="more-tools" className="mx-auto max-w-5xl">
        <h2 id="more-tools" className="text-center text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold tracking-[-0.02em]">More tools</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link href="/platform/translate" className="focus-ring group flex h-full flex-col rounded-tile bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
              <span className="text-[15.5px] font-semibold text-ink">Translate and lip sync</span>
              <span className="mt-1 text-[13.5px] text-muted">Your video in other languages, in the speaker&apos;s own voice.</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent">Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/platform/${o.slug}`} className="focus-ring group flex h-full flex-col rounded-tile bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover">
                <span className="text-[15.5px] font-semibold text-ink">{o.menuTitle}</span>
                <span className="mt-1 text-[13.5px] text-muted">{o.menuText}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent">Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FinalCta locale="en" />
    </div>
  );
}
