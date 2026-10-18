import { cn } from "@/lib/utils";

/** Neutral loading placeholder. Compose a few of these to mirror the page shape. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-surface-muted", className)} />;
}

export function TileSkeleton() {
  return (
    <div className="space-y-3.5">
      <Skeleton className="aspect-[9/16] rounded-tile" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function TileGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <TileSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3 max-w-sm" />
      <Skeleton className="h-5 w-1/2 max-w-md" />
    </div>
  );
}
