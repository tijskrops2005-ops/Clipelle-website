import { PageHeaderSkeleton, Skeleton, TileGridSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-12 lg:space-y-16" aria-busy="true" aria-label="Loading dashboard">
      <PageHeaderSkeleton />
      <div className="grid gap-5 md:grid-cols-3 md:gap-6">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
      <TileGridSkeleton />
    </div>
  );
}
