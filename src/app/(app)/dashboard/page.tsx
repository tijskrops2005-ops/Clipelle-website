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
import { WhenNoProjects } from "@/components/dashboard/WhenNoProjects";

export const metadata: Metadata = { title: "Dashboard" };

/** Days since 1970 (UTC): picks the formats of the day. Called after connection(). */
function dayNumber() {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * The dashboard with one job (31 Oct 2026): what is being made now, your recent videos, and the way
 * to start the next one. One line for credits and plan, the plan card on the right, the explainer only
 * before the first project. The activity feed and the tip of the day are off the dashboard (code kept,
 * docs/removed-blocks.md). One staggered load, then still.
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
        description="Every finished video lands here."
        actions={
          <Button href="/new" variant="accent" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />

      <Overview credits={credits} plan={plan} demo={config.demoMode} />

      <NowCreating />

      <OnboardingChecklist />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <QuickActions />
          {config.features.ads && <FormatPicks day={day} />}
          <RecentProjects />
        </div>
        <aside className="min-w-0" aria-label="Plan">
          <PlanCard plan={planInfo} />
        </aside>
      </div>

      <WhenNoProjects>
        <HowItWorks />
      </WhenNoProjects>
    </div>
  );
}
