import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { UsageCard } from "@/components/dashboard/UsageCard";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-4">
          <h1 className="text-display text-ink">Welcome back</h1>
          <p className="text-[17px] leading-relaxed text-muted">
            Add your product once. We create the product clip, the presenter and
            the final ad, then bring the finished video back here.
          </p>
        </div>
        <Button href="/new" variant="accent" size="lg" className="shrink-0">
          <Plus className="size-5" aria-hidden />
          Create new video
        </Button>
      </header>

      <HowItWorks />

      <RecentProjects />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InspirationRow />
        </div>
        <div className="lg:pt-[68px]">
          <UsageCard />
        </div>
      </div>
    </div>
  );
}
