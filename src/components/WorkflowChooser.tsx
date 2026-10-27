import Link from "next/link";
import { ArrowRight, Clock, Coins } from "lucide-react";
import { config } from "@/lib/config";
import { measured } from "@/content/measured";
import { CREDIT_RULES, adCredits } from "@/lib/plans";
import type { WorkflowKind } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { PresenterIllustration, ProductVideoIllustration } from "@/components/StepIllustrations";

/**
 * Typical wait (26 Oct 2026): our own measured runs from src/content/measured.ts, the same numbers
 * the site shows. The live average of the account's projects is no longer used: two test runs that
 * waited half an hour in the caption service's free test queue made it read 13 and 19 minutes.
 */
const WAIT: Record<WorkflowKind, { minutes: number | null; note: string }> = {
  translate: { minutes: measured.translationMinutes, note: "for a short video" },
  ad: { minutes: measured.adMinutes, note: "for a 30-second ad" },
};

function formatWait(min: number | null) {
  if (min == null) return "a few minutes";
  return `about ${Number.isInteger(min) ? min : min.toFixed(1)} min`;
}

/** What the customer pays, in credits (plans.ts): the shortest Standard ad, and Speed translation per second. */
const FROM_AD = adCredits({ seconds: 10, engine: "avatar_iii" });
const TRANSLATE_PER_SECOND = CREDIT_RULES.translate.speed;

type Workflow = {
  /** Which wait to show; "URL to video" is the ad workflow with a different start. */
  kind: WorkflowKind;
  href: string;
  title: string;
  text: string;
  price: string;
  Preview: () => React.ReactNode;
};

const translateWorkflows: Workflow[] = [
  {
    kind: "translate",
    href: "/new/translate",
    title: "Translate a video",
    text: "The speaker keeps their own voice, the lips follow the new language and captions are added. Several languages at once.",
    price: `${TRANSLATE_PER_SECOND} credit per second, per language`,
    Preview: TranslatePreview,
  },
  {
    kind: "translate",
    href: "/new/translate?speaker=presenter",
    title: "Translate with a presenter",
    text: "The words of your video, translated and spoken by an AI presenter you pick, with the voice and accent you choose.",
    price: `from ${FROM_AD} credits`,
    Preview: PresenterPreview,
  },
];

const adWorkflows: Workflow[] = [
  {
    kind: "ad",
    href: "/new/ad",
    title: "Ad from a product photo",
    text: "Photos and a short description become a finished 9:16 ad with a presenter, product footage and captions.",
    price: `from ${FROM_AD} credits`,
    Preview: AdPreview,
  },
  {
    kind: "ad",
    href: "/new/url",
    title: "Ad from a product link",
    text: "Paste a product page link. Name, description and photos are read for you to check; then the same ad is made.",
    price: `from ${FROM_AD} credits`,
    Preview: UrlPreview,
  },
];

/**
 * The ways to start: a preview in our own style, one sentence, the typical wait and the credits.
 * With ads switched off (27 Oct 2026) the two translation tools are the big cards and the ad tools
 * sit underneath as "Coming soon"; their pages explain and take a "Notify me".
 */
export function WorkflowChooser() {
  if (config.features.ads) {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {[translateWorkflows[0], ...adWorkflows].map((w) => <WorkflowCard key={w.href} {...w} />)}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2">
        {translateWorkflows.map((w) => <WorkflowCard key={w.href} {...w} />)}
      </div>
      <div>
        <p className="label-mono text-muted">Coming soon</p>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {adWorkflows.map(({ href, title, text, Preview }) => (
            <li key={href}>
              <Link href={href} className="focus-ring group flex h-full items-center gap-4 rounded-card border border-border bg-surface/60 p-4 transition-colors duration-150 hover:bg-surface">
                <span className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-surface-muted opacity-70 [&_*]:scale-[0.8]" aria-hidden><Preview /></span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold text-ink">{title}</span><Badge tone="warning">Soon</Badge></span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-muted">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WorkflowCard({ kind, href, title, text, price, Preview }: Workflow) {
  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col rounded-card bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6"
    >
      <div className="panel relative grid h-40 place-items-center overflow-hidden">
        <Preview />
      </div>
      <h2 className="mt-5 text-[19px] font-semibold leading-tight text-ink">{title}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{text}</p>
      <div className="mt-auto pt-5">
        <ul className="flex flex-wrap gap-2 text-[12.5px]">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-ink"><Clock className="size-3.5 text-accent" aria-hidden />{formatWait(WAIT[kind].minutes)}<span className="sr-only"> {WAIT[kind].note}</span></li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-ink"><Coins className="size-3.5 text-accent" aria-hidden />{price}</li>
        </ul>
        <span className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-medium text-surface transition-colors duration-150 group-hover:bg-ink/90">
          Start
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/* ---------- previews: small original mock-ups of the result, no imagery from elsewhere ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-[66px] overflow-hidden rounded-[10px] bg-ink shadow-card">
      {children}
    </div>
  );
}

function CaptionLine({ words, accentIndex }: { words: string[]; accentIndex: number }) {
  return (
    <p className="absolute inset-x-1.5 bottom-3 text-center text-[7px] font-bold uppercase leading-tight text-white">
      {words.map((w, i) => (
        <span key={i} className={i === accentIndex ? "text-accent" : undefined}>
          {w}{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

function AdPreview() {
  return (
    <div className="flex items-center justify-center gap-4">
      <ProductVideoIllustration className="h-[64px] w-[84px] text-ink/60" />
      <PhoneFrame>
        <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
        <PresenterIllustration className="absolute left-1/2 top-3 h-10 w-16 -translate-x-1/2 text-ink/50" />
        <div className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" aria-hidden />
        <CaptionLine words={["Meet", "your", "glow"]} accentIndex={1} />
      </PhoneFrame>
    </div>
  );
}

function UrlPreview() {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex h-[64px] w-[84px] flex-col justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-2.5" aria-hidden>
        <span className="h-1.5 w-12 rounded-full bg-accent/70" />
        <span className="h-1.5 w-14 rounded-full bg-ink/20" />
        <span className="h-1.5 w-10 rounded-full bg-ink/20" />
        <span className="mt-1 h-5 w-5 rounded-[4px] bg-ink/10" />
      </div>
      <span className="label-mono text-muted" aria-hidden>→</span>
      <PhoneFrame>
        <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
        <PresenterIllustration className="absolute left-1/2 top-3 h-10 w-16 -translate-x-1/2 text-ink/50" />
        <CaptionLine words={["From", "one", "link"]} accentIndex={2} />
      </PhoneFrame>
    </div>
  );
}

function PresenterPreview() {
  return (
    <div className="flex items-center justify-center gap-4">
      <PhoneFrame>
        <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
        <span className="label-mono absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[8px] text-ink">EN</span>
        <CaptionLine words={["Hello"]} accentIndex={0} />
      </PhoneFrame>
      <span className="label-mono text-muted" aria-hidden>→</span>
      <PhoneFrame>
        <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
        <PresenterIllustration className="absolute left-1/2 top-3 h-10 w-16 -translate-x-1/2 text-ink/50" />
        <span className="label-mono absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[8px] text-ink">DE</span>
        <CaptionLine words={["Hallo"]} accentIndex={0} />
      </PhoneFrame>
    </div>
  );
}

function TranslatePreview() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex gap-2">
        {["EN", "DE", "FR"].map((tag, i) => (
          <PhoneFrame key={tag}>
            <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
            <span className="label-mono absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[8px] text-ink">{tag}</span>
            <CaptionLine words={i === 0 ? ["Hello"] : i === 1 ? ["Hallo"] : ["Bonjour"]} accentIndex={0} />
          </PhoneFrame>
        ))}
      </div>
    </div>
  );
}
