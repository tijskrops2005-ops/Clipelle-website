import { examples, GALLERY_SLOTS, type Example } from "@/content/examples";
import { cn } from "@/lib/utils";

/** Our own finished videos as 9:16 tiles; empty slots read "Sample coming soon". */
export function ExampleGallery({ limit = GALLERY_SLOTS, kind, className }: { limit?: number; kind?: Example["kind"]; className?: string }) {
  const list = (kind ? examples.filter((e) => e.kind === kind) : examples).slice(0, limit);
  const placeholders = Math.max(0, limit - list.length);
  return (
    <ul className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {list.map((e) => (
        <li key={e.id} className="group">
          <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-ink shadow-card transition-[box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover">
            <video src={e.src} poster={e.poster} muted loop playsInline preload="metadata" controls aria-label={`${e.title}: ${e.note}`} className="size-full object-cover" />
            <span className="label-mono pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-surface/90 px-2 py-1 text-ink shadow-soft">Sample made with Reelay</span>
          </div>
          <p className="mt-2.5 truncate text-sm font-semibold text-ink">{e.title}</p>
          <p className="truncate text-[13px] text-muted">{e.note}</p>
        </li>
      ))}
      {Array.from({ length: placeholders }, (_, i) => (
        <li key={`ph-${i}`}>
          <div className="relative aspect-[9/16] overflow-hidden rounded-tile border border-dashed border-border bg-surface-muted">
            <div className="absolute inset-0 grid place-items-center p-4 text-center">
              <span className="label-mono text-muted">Sample coming soon</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
