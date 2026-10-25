import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { getCreditBalance } from "@/lib/credits";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { NowCreating } from "@/components/dashboard/NowCreating";
import { Overview } from "@/components/dashboard/Overview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FormatPicks } from "@/components/dashboard/FormatPicks";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TipCard } from "@/components/dashboard/TipCard";

export const metadata: Metadata = { title: "Dashboard" };

/** Days since 1970 (UTC): picks the formats and the tip of the day. Called after connection(). */
function dayNumber() {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * The dashboard (23 Oct 2026; layout after getvidforge.com's dashboard, our own content, data and
 * brand): credits and plan, quick actions, formats, recent projects; on the right the plan card,
 * activity and a tip of the day; the flow explained at the bottom. One staggered load, then still.
 */
export default async function DashboardPage() {
  await connection(); // personal and dated: request-time
  const scope = await getScope();
  const first = scope?.user.name?.split(" ")[0];
  const credits = scope && !config.demoMode ? await getCreditBalance(scope.workspaceId).catch(() => null) : null;
  const plan = planByKey(scope?.planKey) ?? planByKey("free") ?? null;
  const planInfo = plan ? { key: plan.key, name: plan.name, monthlyUsd: plan.monthlyUsd, creditsPerMonth: plan.creditsPerMonth, creditsNote: plan.creditsNote } : null;
  const day = dayNumber();

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        title={first ? `Welcome back, ${first}` : "Welcome back"}
        description="Translate a video you own into other languages, or turn a product photo into a finished 9:16 ad. Every finished video lands here."
        actions={
          <Button href="/new" variant="accent" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />

      <Overview credits={credits} plan={planInfo} demo={config.demoMode} />

      <NowCreating />

      <OnboardingChecklist />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <QuickActions />
          <FormatPicks day={day} />
          <RecentProjects />
        </div>
        <aside className="min-w-0 space-y-4" aria-label="Plan, activity and tip">
          <PlanCard plan={planInfo} />
          <ActivityFeed />
          <TipCard day={day} />
        </aside>
      </div>

      <HowItWorks />
    </div>
  );
}
