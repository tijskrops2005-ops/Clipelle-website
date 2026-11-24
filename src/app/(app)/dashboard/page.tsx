import type { Metadata } from "next";
import { connection } from "next/server";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { getCreditBalance } from "@/lib/credits";
import { planByKey } from "@/lib/plans";
import { DEMO_BALANCE } from "@/lib/mock/account";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { RecentList } from "@/components/dashboard/RecentList";
import { WhatsNew } from "@/components/dashboard/WhatsNew";
import { NowCreating } from "@/components/dashboard/NowCreating";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { FormatPicks } from "@/components/dashboard/FormatPicks";
import { WhenNoProjects } from "@/components/dashboard/WhenNoProjects";

export const metadata: Metadata = { title: "Dashboard" };

/** Days since 1970 (UTC): picks the formats of the day. Called after connection(). */
function dayNumber() {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * The dashboard (24 Nov 2026): four numbers from your own projects and the ledger, the getting-started
 * list until it is done, recent videos as a list, what is running and the newest update beside it, and
 * the explainer only before the first project. Older pieces stay in src/components/dashboard/
 * (Overview, RecentProjects, PlanCard, QuickActions; docs/removed-blocks.md).
 */
export default async function DashboardPage() {
  await connection(); // personal and dated: request-time
  const scope = await getScope();
  const first = scope?.user.name?.split(" ")[0];
  const credits = scope ? (config.demoMode ? DEMO_BALANCE : await getCreditBalance(scope.workspaceId).catch(() => null)) : null;
  const plan = planByKey(scope?.planKey) ?? planByKey("free") ?? null;
  const day = dayNumber();

  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : null;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 24 Nov 2026 (Tijs, after splister.com/app): four numbers, then recent videos as a list with what is
          running and what is new beside it. The sidebar keeps the accent "Create new video"; the header
          button is the quiet black one. */}
      <PageHeader
        title={name ? `Welcome back, ${name}` : "Welcome back"}
        actions={
          <Button href="/new" variant="primary">
            <Plus className="size-4" aria-hidden />
            New video
          </Button>
        }
      />

      <DashboardStats credits={credits} plan={plan} demo={config.demoMode} />

      <OnboardingChecklist planKey={scope?.planKey} />

      {config.features.ads && <FormatPicks day={day} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <RecentList />
        <div className="space-y-6">
          <NowCreating showEmpty />
          <WhatsNew />
        </div>
      </div>

      <WhenNoProjects>
        <HowItWorks />
      </WhenNoProjects>
    </div>
  );
}
