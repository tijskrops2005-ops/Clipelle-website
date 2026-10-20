import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowChooser } from "@/components/WorkflowChooser";

export const metadata: Metadata = { title: "New video" };

/** First choice when creating a video: which of the two workflows. The tiles are a client component (typical wait from the projects list). */
export default function NewVideoPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <PageHeader title="New video" description="What do you want to make? Both run on their own after you click start." />
      <WorkflowChooser />
    </div>
  );
}
