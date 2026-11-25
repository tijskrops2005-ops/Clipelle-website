import { PageHeaderSkeleton, TileGridSkeleton } from "@/components/ui/Skeleton";

export default function EditLoading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading videos">
      <PageHeaderSkeleton />
      <TileGridSkeleton count={8} />
    </div>
  );
}
