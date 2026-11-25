"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Play, Sparkles, X } from "lucide-react";

/** The walk-through (25 Nov 2026, after splister.com/app): our own app in demo mode, recorded step by step. */
export const DEMO_VIDEO = { src: "/demo/clipelle-walkthrough.mp4", poster: "/demo/clipelle-walkthrough.jpg", minutes: "±30 seconds" };

/**
 * The demo on the dashboard: an ink card with a warm glow and a play button; the video opens in a dark
 * window with what it shows, its length and one way to start. Opens only on a click.
 */
export function DemoVideo() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      void video.current?.play().catch(() => {});
    }
    if (!open && d.open) d.close();
    if (!open) video.current?.pause();
  }, [open]);

  return (
    <>
      <section aria-labelledby="demo-card" className="relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-card sm:p-6">
        <div className="ink-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-light/40 bg-accent/15 px-2.5 py-0.5 text-[12px] font-medium text-accent-light">
            <Sparkles className="size-3.5" aria-hidden />
            Demo
          </span>
          <h2 id="demo-card" className="mt-3 text-[17px] font-semibold leading-snug">See the whole flow in 30 seconds</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">Upload, pick languages, follow the progress, download and edit.</p>
          <button type="button" onClick={() => setOpen(true)} className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[14px] font-semibold text-white shadow-accent transition-colors hover:bg-accent-hover">
            <Play className="size-4" aria-hidden />
            Watch the demo
          </button>
        </div>
      </section>

      <dialog
        ref={dialog}
        aria-labelledby="demo-title"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        className="m-auto w-[calc(100%-24px)] max-w-4xl overflow-hidden rounded-[24px] bg-ink p-0 text-white shadow-card-hover backdrop:bg-ink/70 backdrop:backdrop-blur-sm open:fold-in"
      >
        <div className="relative overflow-hidden px-6 pb-5 pt-6 sm:px-8">
          <div className="ink-glow pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-light/40 bg-accent/15 px-2.5 py-0.5 text-[12px] font-medium text-accent-light">
                <Sparkles className="size-3.5" aria-hidden />
                Demo
              </span>
              <h2 id="demo-title" className="mt-3 text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">Translate your first video in 2 minutes</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[14.5px] text-white/70">
                From uploading a video to downloading every language, the whole flow in one video.
                <span className="inline-flex items-center gap-1 text-white/85"><Clock3 className="size-4" aria-hidden />{DEMO_VIDEO.minutes}</span>
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <video ref={video} src={open ? DEMO_VIDEO.src : undefined} poster={DEMO_VIDEO.poster} controls playsInline preload="none" className="block aspect-video w-full bg-black" aria-label="Clipelle walk-through" />
        <div className="flex items-center justify-between gap-3 bg-surface px-6 py-4 sm:px-8">
          <button type="button" onClick={() => setOpen(false)} className="focus-ring rounded-control text-[14px] font-medium text-ink hover:text-muted">Close</button>
          <Link href="/app/new/translate" onClick={() => setOpen(false)} className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-white shadow-accent transition-colors hover:bg-accent-hover">
            Translate your first video
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </dialog>
    </>
  );
}
