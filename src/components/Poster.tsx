import { cn } from "@/lib/utils";

type PosterProps = {
  /** Kept for callers; the poster no longer varies by seed (31 Oct 2026). */
  seed?: string;
  /** Big letter in the corner when there are no tags (ads: the product's initial). */
  monogram?: string;
  /** Language codes of a translation, as short tags along the bottom. */
  tags?: string[];
  imageUrl?: string;
  className?: string;
};

/**
 * Fills its parent: the first product image, or our own tile (31 Oct 2026, instead of a stock-looking
 * gradient): ink with a soft gold light top-left and the language codes (or the monogram) in gold
 * mono along the bottom. Gold sits on ink only (brand rule), never on paper.
 */
export function Poster({ monogram, tags, imageUrl, className }: PosterProps) {
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
  const shown = tags?.slice(0, 6) ?? [];
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)}>
      <div className="absolute -left-1/3 -top-1/4 size-[90%] rounded-full bg-gold/25 blur-3xl" aria-hidden />
      {shown.length > 0 ? (
        <ul className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5" aria-hidden>
          {shown.map((t) => (
            <li key={t} className="label-mono rounded-full border border-gold/50 px-2 py-0.5 text-gold">{t}</li>
          ))}
          {tags && tags.length > shown.length && <li className="label-mono self-center text-gold/70">+{tags.length - shown.length}</li>}
        </ul>
      ) : monogram ? (
        <span aria-hidden className="absolute bottom-3 right-4 select-none text-[56px] font-semibold leading-none tracking-tight text-gold/35">
          {monogram}
        </span>
      ) : null}
    </div>
  );
}
