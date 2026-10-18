import { PageHeaderSkeleton, Skeleton, TileGridSkeleton } from "@/components/ui/Skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading projects">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-80 max-w-full rounded-full" />
      <TileGridSkeleton count={8} />
    </div>
  );
}
