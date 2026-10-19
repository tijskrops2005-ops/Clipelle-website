import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobsPanel } from "./JobsPanel";

export const metadata: Metadata = { title: "Background jobs" };

/** Developer-only: smoke test of the Inngest job system. 404 outside development. */
export default function JobsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Background jobs"
        badge={<Badge>Free · local</Badge>}
        description="The job system that will run both workflows. Start the dev server with npm run dev:jobs, then send the smoke-test event: a greeting step, a step that fails once and is retried, a 5-second pause, done. The run and its steps are also visible on localhost:8288."
      />
      <JobsPanel />
    </div>
  );
}
