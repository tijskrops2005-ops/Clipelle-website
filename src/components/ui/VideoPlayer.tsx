import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/DemoModeBadge";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  /** Shows a visible "Simulated preview" label over the player. */
  simulated?: boolean;
  className?: string;
};

/** Native 9:16 player inside a soft frame. Controls, play/pause and scrubbing come from the browser. */
export function VideoPlayer({ src, poster, simulated, className }: VideoPlayerProps) {
  return (
    <div
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-tile bg-ink shadow-card",
        className,
      )}
    >
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        aria-label="Preview of your video"
        className="size-full object-cover"
      />
      {simulated && (
        <DemoBadge className="absolute left-3 top-3 bg-surface shadow-card">
          Simulated preview
        </DemoBadge>
      )}
    </div>
  );
}
