"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/DemoModeBadge";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  /** Shows a visible "Simulated preview" label over the player. */
  simulated?: boolean;
  className?: string;
  /** "cover" fills the 9:16 frame (ads); "contain" shows the whole picture (source videos). */
  fit?: "cover" | "contain";
  muted?: boolean;
  aspect?: "9:16" | "16:9";
};

/**
 * Keeps the <video src> stable while the same file is shown: a signed URL for the same storage
 * path may be re-issued by a later poll, but swapping the src would reload the player mid-play.
 * The src only changes when the file (path) changes or the old URL is about to expire.
 */
export function useStableSrc(src: string, maxAgeMs = 45 * 60 * 1000) {
  // A ticking generation forces a refresh of the (otherwise frozen) src before the signed URL expires.
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setGeneration((g) => g + 1), maxAgeMs);
    return () => window.clearInterval(id);
  }, [maxAgeMs]);
  const key = fileKey(src);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately frozen per file and generation
  return useMemo(() => src, [key, generation]);
}

/** The part of a URL that identifies the file: everything before the query string (tokens change, files do not). */
function fileKey(src: string) {
  const i = src.indexOf("?");
  return i === -1 ? src : src.slice(0, i);
}

/** Native player inside a soft frame. Controls, play/pause and scrubbing come from the browser. */
export function VideoPlayer({ src, poster, simulated, className, fit = "cover", muted, aspect = "9:16" }: VideoPlayerProps) {
  const stableSrc = useStableSrc(src);
  return (
    <div className={cn("relative overflow-hidden rounded-tile bg-ink shadow-card", aspect === "9:16" ? "aspect-[9/16]" : "aspect-video", className)}>
      <video
        key={fileKey(stableSrc)}
        src={stableSrc}
        poster={poster}
        controls
        muted={muted}
        playsInline
        preload="metadata"
        aria-label="Preview of your video"
        className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
      />
      {simulated && (
        <DemoBadge className="absolute left-3 top-3 bg-surface shadow-card">
          Simulated preview
        </DemoBadge>
      )}
    </div>
  );
}
