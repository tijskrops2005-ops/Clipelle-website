import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { FORMATS } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";

/**
 * "Start from a format": three of the eight real presets, a different three each day (not a
 * personal recommendation, so it is not called one). Each opens the ad form with the format chosen.
 */
export function FormatPicks({ day }: { day: number }) {
  const start = (day * 3) % FORMATS.length;
  const picks = [0, 1, 2].map((i) => FORMATS[(start + i) % FORMATS.length]);
  return (
    <section className="rise space-y-4" style={{ "--rise-delay": "400ms" } as CSSProperties} aria-labelledby="format-picks">
      <div className="flex items-center justify-between gap-3">
        <h2 id="format-picks" className="text-[16px] font-semibold text-ink">Start an ad from a format</h2>
        <Link href="/new/ad" className="focus-ring inline-flex items-center gap-1 rounded-control text-[13px] text-muted transition-colors duration-150 hover:text-ink">
          All eight formats <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {picks.map((f) => (
          <li key={f.key}>
            <Link href={`/new/ad?format=${f.key}`} className="focus-ring group flex h-full flex-col rounded-card bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="grid size-11 place-items-center rounded-[12px] bg-surface-muted text-ink/70 transition-colors duration-200 group-hover:text-accent">
                <FormatIllustration format={f.key} className="h-6 w-8" />
              </span>
              <span className="mt-4 text-[15px] font-semibold text-ink">{f.name}</span>
              <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{f.blurb}</span>
              <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-surface transition-transform duration-200 group-hover:-translate-y-px">
                <Zap className="size-3.5" aria-hidden /> Use this format
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
