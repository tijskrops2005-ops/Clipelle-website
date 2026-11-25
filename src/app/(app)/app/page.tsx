import type { Metadata } from "next";
import { connection } from "next/server";
import { getScope } from "@/lib/auth";
import { listProjects } from "@/lib/data/server";
import { ProjectsProvider } from "@/lib/data/ProjectsProvider";
import { config } from "@/lib/config";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { RecentList } from "@/components/dashboard/RecentList";
import { WhatsNew } from "@/components/dashboard/WhatsNew";
import { ToolTiles } from "@/components/dashboard/ToolTiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemoVideo } from "@/components/dashboard/DemoVideo";
import { Button } from "@/components/ui/Button";
import { LayoutGrid } from "lucide-react";
import { NowCreating } from "@/components/dashboard/NowCreating";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
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
  const day = dayNumber();
  // The list rendered on the server (25 Nov 2026, speed): no second round trip before the recent videos show.
  const initial = scope && !config.demoMode ? await listProjects(scope).catch(() => undefined) : undefined;

  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : null;

  return (
    <ProjectsProvider initial={initial}>
    {/* 25 Nov 2026 (Tijs: less white space, more personality): one ink welcome band with the credits, the
        four ways to start in their category colours, three numbers in one card, then recent videos with
        getting started, what is running and what is new beside them. Tighter gaps than before. */}
    <div className="space-y-5 lg:space-y-6">
      {/* 25 Nov 2026 (Tijs, after splister.com/app): a quiet page header instead of the ink band; the
          credits sit in the top bar, the red "Create new video" in the sidebar. */}
      <PageHeader
        title={name ? `Welcome back, ${name}` : "Welcome back"}
        description="Create, translate, edit and enhance your videos and images."
        actions={
          <Button href="/app/tools" variant="primary">
            <LayoutGrid className="size-4" aria-hidden />
            All tools
          </Button>
        }
      />

      <ToolTiles />

      <DashboardStats />

      {config.features.ads && <FormatPicks day={day} />}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
        <RecentList />
        <div className="space-y-5 lg:space-y-6">
          <DemoVideo />
          <OnboardingChecklist planKey={scope?.planKey} />
          <NowCreating showEmpty />
          <WhatsNew />
        </div>
      </div>

      <WhenNoProjects>
        <HowItWorks />
      </WhenNoProjects>
    </div>
    </ProjectsProvider>
  );
}
