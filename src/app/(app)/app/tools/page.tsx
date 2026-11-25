import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AllTools } from "@/components/tools/AllTools";

export const metadata: Metadata = { title: "All tools" };

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="All tools" description="Create, translate, edit and enhance your videos and images." />
      <AllTools />
    </div>
  );
}
