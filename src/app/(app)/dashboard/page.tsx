import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { UsageCard } from "@/components/dashboard/UsageCard";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-12 lg:space-y-16">
      <PageHeader
        title="Welcome back"
        description="Add your product once. We create the product clip, the presenter and the final ad, then bring the finished video back here."
        actions={
          <Button href="/new" variant="accent" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />

      <HowItWorks />

      <RecentProjects />

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <InspirationRow />
        </div>
        <div className="min-w-0 xl:pt-[68px]">
          <UsageCard />
        </div>
      </div>
    </div>
  );
}
