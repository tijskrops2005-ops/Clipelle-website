"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Clock, Tag } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { projectDurationMs } from "@/lib/projectMeta";
import { measured } from "@/content/measured";
import { DEFAULTS, estimateAdCost, estimateTranslateCost, formatUsd } from "@/lib/pricing";
import type { Project, WorkflowKind } from "@/lib/types";
import { PresenterIllustration, ProductVideoIllustration, TranslateIllustration } from "@/components/StepIllustrations";

/**
 * Typical wait before this account has finished a project of that kind: our own measured runs
 * (src/content/measured.ts), or an assumption from the providers' stated render times when a
 * value is missing there.
 */
const FALLBACK_MINUTES: Record<WorkflowKind, number> = { ad: measured.adMinutes ?? 10, translate: measured.translationMinutes ?? 5 };

/** Average wall-clock time of completed projects of one kind, in minutes; undefined without data. */
function averageMinutes(projects: Project[], kind: WorkflowKind) {
  const durations = projects
    .filter((p) => p.workflow === kind && p.status === "completed")
    .map(projectDurationMs)
    .filter((ms): ms is number => ms !== undefined);
  if (durations.length === 0) return undefined;
  return durations.reduce((a, b) => a + b, 0) / durations.length / 60_000;
}

function formatMinutes(min: number) {
  if (min < 1) return "under a minute";
  const rounded = Math.round(min);
  return `about ${rounded} ${rounded === 1 ? "minute" : "minutes"}`;
}

/** Cheapest configuration of each workflow: the "from" price on the chooser, with the forms' own numbers. */
const FROM_AD = estimateAdCost({ seconds: 10, clipModel: DEFAULTS.clipModel, engine: "avatar_iii" }).total;
const FROM_TRANSLATE = estimateTranslateCost({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }).perLanguageTotal;

const workflows: {
  /** Which wait and price to show; "URL to video" is the ad workflow with a different start. */
  kind: WorkflowKind;
  href: string;
  title: string;
  text: string;
  price: string;
  Preview: () => React.ReactNode;
}[] = [
  {
    kind: "ad",
    href: "/new/ad",
    title: "Make an ad from a product photo",
    text: "Photos and a short description become a finished 9:16 ad with a presenter, product footage and captions.",
    price: `from ${formatUsd(FROM_AD)} per video`,
    Preview: AdPreview,
  },
  {
    kind: "ad",
    href: "/new/url",
    title: "Make an ad from a product link",
    text: "Paste a product page link. Name, description and photos are read from the page for you to check; then the same ad is made.",
    price: `from ${formatUsd(FROM_AD)} per video`,
    Preview: UrlPreview,
  },
  {
    kind: "translate",
    href: "/new/translate",
    title: "Translate an existing video",
    text: "A video you own comes back in other languages, with the speaker's own voice, matching lips and captions.",
    price: `from ${formatUsd(FROM_TRANSLATE)} per minute per language`,
    Preview: TranslatePreview,
  },
];

/** The two workflow tiles: one sentence, a preview in our own style, the typical wait and the starting price. */
export function WorkflowChooser() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const waits = useMemo(
    () => ({
      ad: { minutes: averageMinutes(projects, "ad"), measured: averageMinutes(projects, "ad") !== undefined },
      translate: { minutes: averageMinutes(projects, "translate"), measured: averageMinutes(projects, "translate") !== undefined },
    }),
    [projects],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {workflows.map(({ kind, href, title, text, price, Preview }) => {
        const wait = waits[kind];
        const minutes = wait.minutes ?? FALLBACK_MINUTES[kind];
        return (
          <Link
            key={href}
            href={href}
            className="focus-ring group flex flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-7"
          >
            <div className="panel relative overflow-hidden p-6">
              <Preview />
            </div>
            <h2 className="mt-6 text-xl font-semibold leading-tight text-ink">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <div>
                  <dt className="label-mono text-muted">Typical wait</dt>
                  <dd className="mt-0.5 text-ink">
                    {!ready ? (
                      <span className="text-muted">Measuring…</span>
                    ) : (
                      <>
                        {formatMinutes(minutes)}
                        {!wait.measured && <span className="text-muted"> (typical)</span>}
                      </>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Tag className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <div>
                  <dt className="label-mono text-muted">Price</dt>
                  <dd className="mt-0.5 text-ink">{price}</dd>
                </div>
              </div>
            </dl>
            <span className="mt-6 inline-flex h-10 w-fit items-center gap-2 rounded-control bg-ink px-4 text-sm font-medium text-surface transition-colors duration-150 group-hover:bg-ink/90">
              Start
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- previews: small original mock-ups of the result, no imagery from elsewhere ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-[88px] overflow-hidden rounded-[12px] bg-ink shadow-card">
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
      <span className="label-mono absolute right-3 top-3 text-muted">Preview</span>
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
      <span className="label-mono absolute right-3 top-3 text-muted">Preview</span>
    </div>
  );
}

function TranslatePreview() {
  return (
    <div className="flex items-center justify-center gap-4">
      <TranslateIllustration className="h-[64px] w-[84px] text-ink/60" />
      <div className="flex gap-2">
        {["EN", "DE", "FR"].map((tag, i) => (
          <PhoneFrame key={tag}>
            <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-border" />
            <span className="label-mono absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[8px] text-ink">{tag}</span>
            <CaptionLine words={i === 0 ? ["Hello"] : i === 1 ? ["Hallo"] : ["Bonjour"]} accentIndex={0} />
          </PhoneFrame>
        ))}
      </div>
      <span className="label-mono absolute right-3 top-3 text-muted">Preview</span>
    </div>
  );
}
