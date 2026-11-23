import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { getCreditBalance } from "@/lib/credits";
import { planByKey } from "@/lib/plans";
import { DEMO_BALANCE } from "@/lib/mock/account";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { NowCreating } from "@/components/dashboard/NowCreating";
import { Overview } from "@/components/dashboard/Overview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FormatPicks } from "@/components/dashboard/FormatPicks";
import { WhenNoProjects } from "@/components/dashboard/WhenNoProjects";

export const metadata: Metadata = { title: "Dashboard" };

/** Days since 1970 (UTC): picks the formats of the day. Called after connection(). */
function dayNumber() {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * The dashboard with one job (31 Oct 2026): what is being made now, your recent videos, and the way
 * to start the next one. One line for credits and plan, the explainer only
 * before the first project. The activity feed and the tip of the day are off the dashboard (code kept,
 * docs/removed-blocks.md). One staggered load, then still.
 */
export default async function DashboardPage() {
  await connection(); // personal and dated: request-time
  const scope = await getScope();
  const first = scope?.user.name?.split(" ")[0];
  const credits = scope ? (config.demoMode ? DEMO_BALANCE : await getCreditBalance(scope.workspaceId).catch(() => null)) : null;
  const plan = planByKey(scope?.planKey) ?? planByKey("free") ?? null;
  const day = dayNumber();

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        title={first ? `Welcome back, ${first}` : "Welcome back"}
        description="Every finished video lands here."
        actions={
          // The accent pill is the sidebar's (phone: the top bar's) "Create new video"; this one is the black primary (23 Nov 2026).
          <Button href="/new" variant="primary" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />

      <Overview credits={credits} plan={plan} demo={config.demoMode} />

      <NowCreating />

      <OnboardingChecklist planKey={scope?.planKey} />

      {/* The dark plan card is off the dashboard (23 Nov 2026, docs/removed-blocks.md): the sidebar chip and the link next to the balance are the two ways to a plan. */}
      <div className="min-w-0 space-y-6">
        <QuickActions />
        {config.features.ads && <FormatPicks day={day} />}
        <RecentProjects />
      </div>

      <WhenNoProjects>
        <HowItWorks />
      </WhenNoProjects>
    </div>
  );
}
