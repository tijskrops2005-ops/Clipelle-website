import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductVideoIllustration, TranslateIllustration } from "@/components/StepIllustrations";

export const metadata: Metadata = { title: "New video" };

const workflows = [
  {
    href: "/new/ad",
    kicker: "Workflow A",
    title: "Make an ad from a product photo",
    text: "Upload product photos and a short description. We write the script, animate the product, add an AI presenter and cut a 9:16 ad.",
    bullets: ["Script written for you", "Product clip and AI presenter", "Captions, music and CTA"],
    Illustration: ProductVideoIllustration,
  },
  {
    href: "/new/translate",
    kicker: "Workflow B",
    title: "Translate an existing video",
    text: "Upload a video you own. We translate the speech, keep the speaker's voice and lip movements, and deliver one 9:16 video per language.",
    bullets: ["Slovak, German, French, Dutch, English", "You review every line first", "Captions and 9:16 included"],
    Illustration: TranslateIllustration,
  },
];

/** First choice when creating a video: which of the two workflows. */
export default function NewVideoPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <PageHeader title="New video" description="What do you want to make? Both run on their own after you click start." />
      <div className="grid gap-6 md:grid-cols-2">
        {workflows.map(({ href, kicker, title, text, bullets, Illustration }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-card bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-4 focus-visible:ring-offset-bg sm:p-7"
          >
            <div className="rounded-[14px] bg-surface-muted p-6">
              <Illustration className="mx-auto h-[88px] w-full max-w-[200px] text-ink/70" />
            </div>
            <p className="label-mono mt-6 text-muted">{kicker}</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-ink">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
              Start
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
