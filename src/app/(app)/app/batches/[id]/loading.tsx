import { PageHeaderSkeleton, Skeleton, TileGridSkeleton } from "@/components/ui/Skeleton";

export default function BatchLoading() {
  return (
    <div className="space-y-10" aria-busy="true">
      <PageHeaderSkeleton />
      <TileGridSkeleton count={3} />
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}
