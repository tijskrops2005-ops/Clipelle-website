import { cn } from "@/lib/utils";

/**
 * A 9:16 phone frame with a looping, muted sample video, or an animated caption placeholder
 * when no sample exists. Used in the hero and the platform pages. Never footage from elsewhere.
 */
export function PhoneFrame({ src, poster, caption = "Sample made with Reelay", placeholder = "Sample coming soon", words = ["Meet", "your", "glow"], className, float = true }: { src?: string; poster?: string; caption?: string; placeholder?: string; words?: string[]; className?: string; float?: boolean }) {
  return (
    <figure className={cn("relative mx-auto w-[240px] sm:w-[280px]", float && "float-soft", className)}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-[32px] border-[6px] border-ink bg-ink shadow-card-hover">
        {src ? (
          <video src={src} poster={poster} muted autoPlay loop playsInline preload="metadata" aria-label={caption} className="size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-surface-muted via-border to-ink/60" aria-hidden>
            <div className="absolute inset-x-4 bottom-10 text-center">
              <p className="caption-pop text-lg font-bold uppercase leading-tight text-white">
                {words.map((w, i) => (
                  <span key={i} className={i === 1 ? "text-accent" : undefined}>
                    {w}{" "}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}
        <span className="label-mono absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-ink shadow-soft">{src ? caption : placeholder}</span>
      </div>
    </figure>
  );
}
