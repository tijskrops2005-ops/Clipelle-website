"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A muted looping sample that downloads nothing until it scrolls near the screen: the poster shows
 * first, the video starts in view and pauses out of view. Keeps the homepage light (eight sample
 * tiles used to download in full on every visit). Under "reduce motion" it stays on the poster.
 * `sound` (25 Oct 2026) turns the sound on after a click: the video restarts from the beginning so
 * the visitor hears it whole; turning it off mutes it again.
 */
export function LazyVideo({ src, poster, label, className, sound = false }: { src: string; poster?: string; label: string; className?: string; sound?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !sound;
    if (sound) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  }, [sound]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={load || sound ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={load || sound}
      preload="none"
      aria-label={label}
      className={cn("size-full object-cover", className)}
    />
  );
}
