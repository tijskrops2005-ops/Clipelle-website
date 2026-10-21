import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-10" aria-busy="true">
      <PageHeaderSkeleton />
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
