import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Admin pages that read the database show this in demo mode (no accounts, no database). */
export function DemoAdminNotice({ title }: { title: string }) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} badge={<DemoBadge>Demo</DemoBadge>} description="Demo mode has no accounts or database. This page reads live data in database mode." />
      <EmptyState title="Nothing to show in demo mode" description="Start the app with NEXT_PUBLIC_DEMO_MODE=false and a database to see real numbers here." />
    </div>
  );
}
