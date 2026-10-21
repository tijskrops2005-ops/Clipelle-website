import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { InspirationRow } from "@/components/dashboard/InspirationRow";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { UsageCard } from "@/components/dashboard/UsageCard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();
  const first = user?.name?.split(" ")[0];
  return (
    <div className="space-y-12 lg:space-y-16">
      <PageHeader
        title={first ? `Welcome back, ${first}` : "Welcome back"}
        description="Add a product once and get a finished 9:16 ad, or translate a video you own into other languages. Every finished video lands here."
        actions={
          <Button href="/new" variant="accent" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />

      <RecentProjects />

      <HowItWorks />

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
