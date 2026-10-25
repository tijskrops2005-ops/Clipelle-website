import { GALLERY_SLOTS, type Example } from "@/content/examples";
import { resolvedExamples } from "@/lib/examples";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Our own finished videos as 9:16 tiles. Only real videos: no placeholder tiles (25 Oct 2026); nothing when there are none. */
export function ExampleGallery({ limit = GALLERY_SLOTS, kind, className, locale = "en" }: { limit?: number; kind?: Example["kind"]; className?: string; locale?: Locale }) {
  const t = dict(locale).common;
  const list = resolvedExamples(kind).slice(0, limit);
  if (list.length === 0) return null;
  return (
    <ul className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {list.map((e) => (
        <li key={e.id} className="group">
          <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-ink shadow-card transition-[box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover">
            <video src={e.src} poster={e.posterSrc} muted loop playsInline preload="metadata" controls aria-label={`${e.title}: ${e.note}`} className="size-full object-cover" />
            <span className="label-mono pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-surface/90 px-2 py-1 text-ink shadow-soft">{t.sampleMadeWith}</span>
          </div>
          <p className="mt-2.5 truncate text-sm font-semibold text-ink">{e.title}</p>
          <p className="truncate text-[13px] text-muted">{e.note}</p>
        </li>
      ))}
    </ul>
  );
}
