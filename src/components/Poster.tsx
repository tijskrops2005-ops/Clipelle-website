import { cn } from "@/lib/utils";

/* Five soft gradients built from design tokens; a project always gets the same one. */
const gradients = [
  "from-accent/35 via-warning/20 to-surface-muted",
  "from-success/25 via-success/10 to-surface-muted",
  "from-ink/20 via-muted/15 to-surface-muted",
  "from-warning/35 via-accent/15 to-surface-muted",
  "from-danger/20 via-accent/10 to-surface-muted",
];

function pick(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return gradients[hash % gradients.length];
}

type PosterProps = {
  /** Used to choose a stable gradient when there is no image. */
  seed: string;
  /** Big letter shown in the corner of the gradient. */
  monogram?: string;
  imageUrl?: string;
  className?: string;
};

/** Fills its parent: the first product image, or a curated gradient with a soft highlight. */
export function Poster({ seed, monogram, imageUrl, className }: PosterProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- demo-only data URL
      <img
        src={imageUrl}
        alt=""
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("absolute inset-0 bg-gradient-to-br", pick(seed), className)}>
      {/* soft highlight top-left, like light falling on a product */}
      <div className="absolute -left-1/4 -top-1/4 size-3/4 rounded-full bg-surface/60 blur-3xl" />
      {monogram && (
        <span
          aria-hidden
          className="absolute bottom-4 right-5 select-none text-[56px] font-semibold leading-none tracking-tight text-ink/15"
        >
          {monogram}
        </span>
      )}
    </div>
  );
}
