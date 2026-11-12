"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A muted looping sample that downloads nothing until it scrolls near the screen: the poster shows
 * first, the video starts in view and pauses out of view. Keeps the homepage light (eight sample
 * tiles used to download in full on every visit). Under "reduce motion" it stays on the poster.
 * `sound` (25 Oct 2026) turns the sound on after a click: the video restarts from the beginning so
 * the visitor hears it whole; turning it off mutes it again.
 * `syncGroup` (12 Nov 2026): videos in the same group run together. The `leader` keeps the clock;
 * every `follower` plays, pauses and restarts with it and is pulled back when it drifts, so an
 * original and its translation stay side by side on the same frame, also when the two have
 * different lengths (the follower plays at the ratio of the lengths).
 */
type SyncRole = "leader" | "follower";
type Group = { leader: HTMLVideoElement | null; followers: Set<HTMLVideoElement>; rates: Map<HTMLVideoElement, number>; detach: (() => void) | null };
const groups = new Map<string, Group>();
const DRIFT_SECONDS = 0.2;

function group(id: string): Group {
  let g = groups.get(id);
  if (!g) {
    g = { leader: null, followers: new Set(), rates: new Map(), detach: null };
    groups.set(id, g);
  }
  return g;
}

/**
 * Wires the leader's events to its followers; called again whenever the group changes. A translation
 * at natural pace runs at another speed than its original (12 Nov 2026: 11.2 s against 13.3 s), so a
 * follower plays at the ratio of the two lengths and is aligned on the same fraction of the video: the
 * two show the same moment and end together, instead of only starting together.
 */
function wire(g: Group) {
  g.detach?.();
  g.detach = null;
  const leader = g.leader;
  if (!leader) return;
  const each = (fn: (f: HTMLVideoElement) => void) => g.followers.forEach((f) => fn(f));
  // A measured pace (Example.originalPace) wins over the ratio of the lengths.
  const ratio = (f: HTMLVideoElement) => g.rates.get(f) ?? (f.duration > 0 && leader.duration > 0 && Number.isFinite(f.duration) && Number.isFinite(leader.duration) ? f.duration / leader.duration : 1);
  const pace = (f: HTMLVideoElement) => {
    const r = Math.min(2, Math.max(0.5, ratio(f)));
    if (Math.abs(f.playbackRate - r) > 0.005) f.playbackRate = r;
  };
  const align = (force = false) => each((f) => {
    pace(f);
    const target = Math.min(leader.currentTime * ratio(f), Math.max(0, (f.duration || Infinity) - 0.05));
    if (force || Math.abs(f.currentTime - target) > DRIFT_SECONDS) f.currentTime = target;
  });
  const onPlay = () => { align(true); each((f) => void f.play().catch(() => {})); };
  const onPause = () => each((f) => f.pause());
  const onTime = () => {
    // The leader looped: everyone starts over together.
    if (leader.currentTime < 0.25) each((f) => { if (f.currentTime > 0.5) { f.currentTime = 0; void f.play().catch(() => {}); } });
    else align();
  };
  const onSeeked = () => align(true);
  const onMeta = () => align(true);
  leader.addEventListener("play", onPlay);
  leader.addEventListener("pause", onPause);
  leader.addEventListener("timeupdate", onTime);
  leader.addEventListener("seeked", onSeeked);
  leader.addEventListener("loadedmetadata", onMeta);
  each((f) => f.addEventListener("loadedmetadata", onMeta));
  g.detach = () => {
    leader.removeEventListener("play", onPlay);
    leader.removeEventListener("pause", onPause);
    leader.removeEventListener("timeupdate", onTime);
    leader.removeEventListener("seeked", onSeeked);
    leader.removeEventListener("loadedmetadata", onMeta);
    each((f) => { f.removeEventListener("loadedmetadata", onMeta); f.playbackRate = 1; });
  };
}

/** Restarts a whole group from the first frame (used when the sound is switched on). */
export function restartSyncGroup(id: string) {
  const g = groups.get(id);
  if (!g?.leader) return;
  g.leader.currentTime = 0;
  g.followers.forEach((f) => { f.currentTime = 0; });
  void g.leader.play().catch(() => {});
}

export function LazyVideo({ src, poster, label, className, sound = false, syncGroup, syncRole = "leader", syncRate }: { src: string; poster?: string; label: string; className?: string; sound?: boolean; syncGroup?: string; syncRole?: SyncRole; /** Follower only: seconds of this video per second of the leader (measured); default = ratio of the lengths. */ syncRate?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !sound;
    if (sound) {
      // In a group the whole pair starts over, so the two stay on the same frame.
      if (syncGroup) restartSyncGroup(syncGroup);
      else {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    }
  }, [sound, syncGroup]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !syncGroup) return;
    const g = group(syncGroup);
    if (syncRole === "leader") g.leader = el;
    else {
      g.followers.add(el);
      if (syncRate && syncRate > 0) g.rates.set(el, syncRate);
    }
    wire(g);
    return () => {
      if (syncRole === "leader" && g.leader === el) g.leader = null;
      else {
        g.followers.delete(el);
        g.rates.delete(el);
      }
      wire(g);
    };
  }, [syncGroup, syncRole, syncRate]);

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

  // A follower never loops on its own: it waits for the leader's restart, so a shorter or longer original stays in step.
  const follower = Boolean(syncGroup) && syncRole === "follower";
  return (
    <video
      ref={ref}
      src={load || sound ? src : undefined}
      poster={poster}
      muted
      loop={!follower}
      playsInline
      autoPlay={load || sound}
      preload="none"
      aria-label={label}
      className={cn("size-full object-cover", className)}
    />
  );
}
