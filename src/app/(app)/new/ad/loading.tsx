import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function NewAdLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-12" aria-busy="true" aria-label="Loading form">
      <PageHeaderSkeleton />
      <Skeleton className="h-96 rounded-card" />
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}
