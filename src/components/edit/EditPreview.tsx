"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isKept, keptRanges, layerKeyOf, PLACE_OFFSET, spotBox, toOutputTime, type EditCover, type EditRecipe } from "@/lib/editRecipe";
import { fitCaptionToCover } from "@/lib/captionFit";
import { isMoving, segmentAt } from "@/lib/captionTrack";
import { musicSrc } from "@/content/musicLibrary";
import { barMeta, effectiveBar } from "@/lib/captionOptions";
import { activeWordIndex, captionCss } from "./captionPreview";

/**
 * The live preview of the edit screen (2 Nov 2026): the finished video plays only what the recipe
 * keeps (cut pieces are skipped while it plays), with the captions, the text bar, the call to
 * action and the logo drawn over it in HTML and CSS, so every change shows at once without a render.
 * `time` is the source clock; the parent owns it so the timeline and the panels can seek.
 */
export function EditPreview({ src, recipe, time, onTime, videoRef, logoUrl, aspect, captionsAreBurnedIn, cover, musicUrl }: { src: string; recipe: EditRecipe; time: number; onTime: (t: number) => void; videoRef: RefObject<HTMLVideoElement | null>; logoUrl?: string | null; aspect: "9:16" | "original"; /** Ads: the captions are part of the picture; the preview draws none. */ captionsAreBurnedIn?: boolean; /** Where on-screen text was removed (one spot, or a spot per stretch when it moved): an opaque bar hides it, as in the render. */ cover?: EditCover; /** An uploaded track of the customer (a library track resolves from the recipe). */ musicUrl?: string | null }) {
  const coverBox = cover?.box;
  const audioRef = useRef<HTMLAudioElement>(null);
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
      const a = audioRef.current;
      if (a) {
        const out = toOutputTime(v!.currentTime, recipe) ?? 0;
        if (Number.isFinite(a.duration) && a.duration > 0) a.currentTime = out % a.duration;
        void a.play().catch(() => {});
      }
    }
    function onPause() {
      setPlaying(false);
      audioRef.current?.pause();
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

  // Over removed text the captions stay on (24 Nov 2026); the bar hides the cleaned spot, per stretch when the old text moved (26 Nov 2026).
  const covered = Boolean(coverBox || cover?.track?.length) && !captionsAreBurnedIn && Boolean(recipe.captions);
  const captions = covered ? recipe.captions! : recipe.captions?.enabled && !captionsAreBurnedIn ? recipe.captions : null;
  const lines = captions ? captions.cues.filter((c) => c.text.trim()) : [];
  const cue = lines.find((c) => time >= c.start && time < c.end);
  const style = captions && covered ? { ...captions.style, bar: effectiveBar(captions.style, true) } : captions?.style;
  const css = captions ? captionCss(style, width) : null;
  // The same bar as the render: font and size from the old text, centred on its spot, fully opaque.
  const frameSize = aspect === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  const barBox = covered ? (isMoving(cover?.track) ? segmentAt(cover!.track!, time)?.box ?? null : coverBox ?? null) : null;
  const fit = barBox ? fitCaptionToCover(barBox, frameSize, captions!.style.size) : null;
  // Where this line goes: on the old text's spot (inside the bar), or a fixed place the customer chose.
  const key = cue && captions ? layerKeyOf(cue, recipe, cover ?? {}) : null;
  const cueBox = key ? spotBox(key, cover ?? {}) : null;
  const cueFit = cueBox ? fitCaptionToCover(cueBox, frameSize, captions!.style.size) : null;
  const placeTop = key === "top" ? (0.5 - PLACE_OFFSET.top) * 100 : key === "middle" ? 50 : 68;
  const music = recipe.music?.enabled ? (recipe.music.source === "upload" ? musicUrl ?? null : musicSrc(recipe.music.track)) : null;
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(1, (recipe.music?.volume ?? 0.2) * 1.6);
  }, [recipe.music?.volume, music]);
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
      {fit && (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${50 - (fit.widthPx / frameSize.width) * 50}%`, width: `${(fit.widthPx / frameSize.width) * 100}%`, top: `${(0.5 - fit.offsetY) * 100}%`, height: `${(fit.heightPx / frameSize.height) * 100}%`, transform: "translateY(-50%)", background: barMeta(style?.bar).color ?? "#FFFFFF", borderRadius: `${18 * (width / frameSize.width)}px` }}
          data-testid="caption-cover"
          aria-hidden
        />
      )}
      {cue && css && cueFit && (
        <div
          className="pointer-events-none absolute flex items-center justify-center overflow-hidden"
          style={{ left: `${50 - (cueFit.widthPx / frameSize.width) * 50}%`, width: `${(cueFit.widthPx / frameSize.width) * 100}%`, top: `${(0.5 - cueFit.offsetY) * 100}%`, height: `${(cueFit.heightPx / frameSize.height) * 100}%`, transform: "translateY(-50%)" }}
        >
          <p style={{ ...css.box, background: "none", width: "auto", padding: `0 ${14 * (width / frameSize.width)}px`, fontSize: `${Math.max(8, cueFit.fontPx * (width / frameSize.width))}px` }}>
            {cue.text.trim().split(/\s+/).map((w, i) => (
              <span key={i} style={css.word(i === wordAt)}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>
      )}
      {cue && css && !cueFit && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: `${placeTop}%`, transform: "translateY(-50%)" }}>
          <p style={css.box}>
            {cue.text.trim().split(/\s+/).map((w, i) => (
              <span key={i} style={css.word(i === wordAt)}>
                {w}{" "}
              </span>
            ))}
          </p>
        </div>
      )}
      {music && <audio ref={audioRef} src={music} preload="auto" loop className="hidden" />}
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
