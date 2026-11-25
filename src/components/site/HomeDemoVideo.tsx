"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

/**
 * The walk-through on the homepage (25 Nov 2026, Tijs): the app recorded in demo mode with a moving cursor
 * and our own calm music. A poster with one play button; the video plays with sound only on a click.
 */
export function HomeDemoVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  return (
    <section aria-labelledby="demo-video" className="mx-auto max-w-5xl text-center">
      <h2 id="demo-video" className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.02em]">See it in 30 seconds</h2>
      <p className="mx-auto mt-3 max-w-xl text-[16px] text-muted">From uploading a video to downloading every language, in the real app.</p>
      <div className="relative mt-8 overflow-hidden rounded-[24px] bg-ink shadow-card-hover">
        <video ref={ref} src={started ? src : undefined} poster={poster} controls={started} playsInline preload="none" className="block aspect-video w-full" aria-label="Clipelle walk-through" />
        {!started && (
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              requestAnimationFrame(() => void ref.current?.play().catch(() => {}));
            }}
            className="focus-ring group absolute inset-0 grid place-items-center"
            aria-label="Play the walk-through"
          >
            <span className="grid size-20 place-items-center rounded-full bg-accent text-white shadow-accent transition-transform duration-150 group-hover:scale-105">
              <Play className="ml-1 size-8" aria-hidden />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
