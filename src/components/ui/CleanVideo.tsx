"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type VideoHTMLAttributes } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "controls" | "className"> & { className?: string; videoClassName?: string };

/**
 * A video with only two controls (26 Oct 2026, Tijs): play/pause bottom left, sound on/off bottom
 * right, and a thin progress line. No browser menu with "download", speed or picture-in-picture;
 * a click on the picture also plays or pauses. Downloads go through the Download button.
 */
export const CleanVideo = forwardRef<HTMLVideoElement, Props>(function CleanVideo({ className, videoClassName, muted: startMuted, ...video }, ref) {
  const el = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => el.current as HTMLVideoElement);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(Boolean(startMuted));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (el.current) el.current.muted = muted;
  }, [muted]);

  function toggle() {
    const v = el.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }

  return (
    <div className={cn("group relative size-full", className)}>
      <video
        ref={el}
        {...video}
        muted={muted}
        playsInline
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onPlay={(e) => {
          setPlaying(true);
          video.onPlay?.(e);
        }}
        onPause={(e) => {
          setPlaying(false);
          video.onPause?.(e);
        }}
        onEnded={(e) => {
          setPlaying(false);
          video.onEnded?.(e);
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setProgress(v.duration ? v.currentTime / v.duration : 0);
          video.onTimeUpdate?.(e);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={toggle}
        className={cn("size-full cursor-pointer", videoClassName)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/55 to-transparent" aria-hidden />
      <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="focus-ring absolute bottom-2.5 left-2.5 grid size-9 place-items-center rounded-full bg-surface/95 text-ink shadow-soft transition-transform duration-150 hover:scale-105">
        {playing ? <Pause className="size-4 fill-current" aria-hidden /> : <Play className="ml-0.5 size-4 fill-current" aria-hidden />}
      </button>
      <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"} aria-pressed={!muted} className="focus-ring absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-surface/95 text-ink shadow-soft transition-transform duration-150 hover:scale-105">
        {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-surface/25" aria-hidden>
        <div className="h-full bg-surface transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
});
