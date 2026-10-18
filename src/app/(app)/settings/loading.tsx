import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-10" aria-busy="true" aria-label="Loading settings">
      <PageHeaderSkeleton />
      <Skeleton className="h-64 rounded-card" />
      <Skeleton className="h-32 rounded-card" />
    </div>
  );
}
