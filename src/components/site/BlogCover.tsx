import { cn } from "@/lib/utils";

/**
 * Own-design cover for an article: a tinted panel with a 9:16 "phone" and caption bars, coloured by
 * category. No photos from anywhere; it is CSS only, so it never shifts the layout.
 */
const TINTS: Record<string, string> = {
  "product-video": "from-accent-soft to-surface-muted",
  "scripts-and-hooks": "from-ink-soft to-surface-muted",
  "captions-and-formats": "from-surface-muted to-accent-soft",
  translation: "from-success/10 to-surface-muted",
  "costs-and-process": "from-warning/10 to-surface-muted",
};

export function BlogCover({ title, category, className }: { title: string; category: string; className?: string }) {
  const initials = title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", TINTS[category] ?? TINTS["product-video"], className)} aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[82%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border-[3px] border-ink bg-ink shadow-card">
        <div className="absolute inset-x-[12%] bottom-[14%] space-y-1">
          <div className="h-1 rounded-full bg-white/80" />
          <div className="mx-auto h-1 w-3/4 rounded-full bg-accent" />
        </div>
      </div>
      <span className="label-mono absolute left-3 top-3 rounded-full bg-surface/90 px-2 py-1 text-ink">{initials}</span>
    </div>
  );
}
