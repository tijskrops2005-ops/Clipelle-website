import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function NewVideoLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-12" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[420px] rounded-card" />
        <Skeleton className="h-[420px] rounded-card" />
      </div>
    </div>
  );
}
