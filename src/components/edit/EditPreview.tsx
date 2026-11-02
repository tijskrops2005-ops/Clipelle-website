"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isKept, keptRanges, type EditRecipe } from "@/lib/editRecipe";
import { activeWordIndex, captionCss } from "./captionPreview";

/**
 * The live preview of the edit screen (2 Nov 2026): the finished video plays only what the recipe
 * keeps (cut pieces are skipped while it plays), with the captions, the text bar, the call to
 * action and the logo drawn over it in HTML and CSS, so every change shows at once without a render.
 * `time` is the source clock; the parent owns it so the timeline and the panels can seek.
 */
export function EditPreview({ src, recipe, time, onTime, videoRef, logoUrl, aspect, captionsAreBurnedIn }: { src: string; recipe: EditRecipe; time: number; onTime: (t: number) => void; videoRef: RefObject<HTMLVideoElement | null>; logoUrl?: string | null; aspect: "9:16" | "original"; /** Ads: the captions are part of the picture; the preview draws none. */ captionsAreBurnedIn?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // While it plays, a cut piece is skipped and the end of the window stops the video.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onUpdate() {
      const t = v!.currentTime;
      const ranges = keptRanges(recipe);
      if (ranges.length === 0) return;
      const last = ranges[ranges.length - 1];
      if (t >= last.end - 0.05) {
        v!.pause();
        v!.currentTime = ranges[0].start;
        onTime(ranges[0].start);
        return;
      }
      if (!isKept(t, recipe)) {
        const next = ranges.find((r) => r.start > t);
        if (next) {
          v!.currentTime = next.start;
          onTime(next.start);
          return;
        }
      }
      onTime(t);
    }
    function onPlay() {
      setPlaying(true);
    }
    function onPause() {
      setPlaying(false);
    }
    v.addEventListener("timeupdate", onUpdate);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onPause);
    return () => {
      v.removeEventListener("timeupdate", onUpdate);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onPause);
    };
  }, [recipe, onTime, videoRef]);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (!isKept(v.currentTime, recipe)) {
        const first = keptRanges(recipe)[0];
        if (first) v.currentTime = first.start;
      }
      void v.play().catch(() => {});
    } else v.pause();
  }

  const captions = recipe.captions?.enabled && !captionsAreBurnedIn ? recipe.captions : null;
  const cue = captions?.cues.find((c) => time >= c.start && time < c.end && c.text.trim());
  const css = captions ? captionCss(captions.style, width) : null;
  const wordAt = cue ? activeWordIndex(cue, time) : -1;
  const lt = recipe.lowerThird?.enabled && recipe.lowerThird.text.trim() && time >= recipe.lowerThird.from && time < recipe.lowerThird.to ? recipe.lowerThird : null;
  const cta = recipe.cta?.enabled && recipe.cta.text.trim() && time >= recipe.cta.from && time < recipe.cta.to ? recipe.cta : null;
  const scale = width / 1080;
  const cutAway = !isKept(time, recipe);

  return (
    <div ref={frameRef} className={cn("relative mx-auto w-full overflow-hidden rounded-tile bg-ink shadow-card", aspect === "9:16" ? "aspect-[9/16] max-w-[260px] sm:max-w-[320px]" : "aspect-video")}>
      <video ref={videoRef} src={src} playsInline preload="metadata" crossOrigin="anonymous" className={cn("size-full", aspect === "9:16" ? "object-cover" : "object-contain")} aria-label="Preview of the edit" />
      {/* overlays, drawn in the frame's own coordinates */}
      {logoUrl && recipe.logo?.enabled && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="pointer-events-none absolute right-[4%] top-[3%] max-h-[8%] max-w-[16%] object-contain drop-shadow" />
      )}
      {lt && (
        <div className={cn("pointer-events-none absolute left-[7%] right-[7%] flex justify-center", lt.position === "top" ? "top-[12%]" : "bottom-[22%]")}>
          <span className="rounded-[10px] bg-ink/80 px-3 py-1.5 text-center font-semibold text-white" style={{ fontSize: `${Math.max(9, 45 * scale)}px` }}>{lt.text}</span>
        </div>
      )}
      {cue && css && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: captions!.position === "middle" ? "50%" : "68%", transform: "translateY(-50%)" }}>
          <p style={css.box}>
            {cue.text.trim().split(/\s+/).map((w, i) => (
              <span key={i} style={css.word(i === wordAt)}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>
      )}
      {cta && (
        <div className="pointer-events-none absolute inset-x-[10%] bottom-[12%] flex justify-center">
          <span className="rounded-full bg-accent px-4 py-2 text-center font-bold text-white shadow-accent" style={{ fontSize: `${Math.max(9, 50 * scale)}px` }}>{cta.text}</span>
        </div>
      )}
      {cutAway && !playing && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/55"><span className="rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-ink">Cut</span></div>}
      <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="focus-ring absolute bottom-3 left-3 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-card transition-colors hover:bg-surface">
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="ml-0.5 size-4" aria-hidden />}
      </button>
    </div>
  );
}
