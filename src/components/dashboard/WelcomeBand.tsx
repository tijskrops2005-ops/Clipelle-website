import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { planLabel, type Plan } from "@/lib/plans";

/**
 * The top of the dashboard (25 Nov 2026, Tijs: "less white, more personality"): one ink band with the
 * welcome, what Clipelle does in one line, the two ways in, and the credits on the right. Gold on ink is
 * the brand's premium moment; red stays the one action colour.
 */
export function WelcomeBand({ name, credits, plan, demo }: { name: string | null; credits: number | null; plan: Plan | null; demo: boolean }) {
  const paid = Boolean(plan && plan.monthlyUsd > 0);
  return (
    <section aria-label="Welcome" className="relative overflow-hidden rounded-card bg-ink px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
      <div className="welcome-glow pointer-events-none absolute -right-24 -top-28 size-[420px] rounded-full" aria-hidden />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h1 className="text-[clamp(1.6rem,2.6vw,2.15rem)] font-semibold leading-tight tracking-[-0.03em]">{name ? `Welcome back, ${name}` : "Welcome back"}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70">Create, translate, edit and enhance your videos and images.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {/* White on ink: the sidebar keeps the one red "Create new video" (one accent per page). */}
            <Link href="/new" className="focus-ring inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink transition-colors duration-150 hover:bg-champagne">
              <Plus className="size-4" aria-hidden />
              Create new video
            </Link>
            <Link href="/tools" className="focus-ring inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-white/10">
              <LayoutGrid className="size-4" aria-hidden />
              All tools
            </Link>
          </div>
        </div>
        <Link href="/settings/billing" className="focus-ring group flex items-center justify-between gap-4 rounded-panel border border-white/10 bg-white/[0.06] px-4 py-3 transition-colors duration-150 hover:bg-white/10 md:block md:min-w-[220px] md:px-5 md:py-4">
          <span>
            <span className="block text-[12.5px] text-champagne/75">{plan ? planLabel(plan) : "Free"} plan{demo ? " · demo" : ""}</span>
            <span className="mt-1 flex items-baseline gap-2 md:block">
              <span className="block text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-gold-light md:text-[30px]">{credits === null ? "—" : credits.toLocaleString("en-US")}</span>
              <span className="block text-[13px] text-white/70 md:mt-1">credits left</span>
            </span>
          </span>
          <span className="block shrink-0 text-[13px] font-medium text-champagne group-hover:underline md:mt-3">{paid ? "Buy credits" : "See plans"}</span>
        </Link>
      </div>
    </section>
  );
}
