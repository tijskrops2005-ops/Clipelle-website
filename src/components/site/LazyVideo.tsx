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

/**
 * Start groups (24 Nov 2026, Tijs: the six hero videos start together): a video with `startGroup`
 * does not start on its own. Once every member that is on screen (not hidden by a breakpoint) can
 * play, they all start from the first frame at the same moment; each then loops on its own. After
 * four seconds the ones that are ready start anyway, so a slow file never holds the others back.
 */
const startGroups = new Map<string, { members: Set<HTMLVideoElement>; started: boolean; timer: number | null }>();
function startGroup(id: string) {
  let g = startGroups.get(id);
  if (!g) {
    g = { members: new Set(), started: false, timer: null };
    startGroups.set(id, g);
  }
  return g;
}
function tryStart(id: string, force = false) {
  const g = startGroups.get(id);
  if (!g || g.started) return;
  const shown = [...g.members].filter((v) => v.getClientRects().length > 0);
  if (shown.length === 0) return;
  const ready = shown.filter((v) => v.readyState >= 3);
  if (!force && ready.length < shown.length) return;
  g.started = true;
  if (g.timer) window.clearTimeout(g.timer);
  for (const v of force ? ready : shown) {
    v.currentTime = 0;
    void v.play().catch(() => {});
  }
  // A late one joins at its own first frame when it is ready.
  if (force) for (const v of shown.filter((x) => !ready.includes(x))) v.addEventListener("canplay", () => void v.play().catch(() => {}), { once: true });
}

/** Restarts a whole group from the first frame (used when the sound is switched on). */
export function restartSyncGroup(id: string) {
  const g = groups.get(id);
  if (!g?.leader) return;
  g.leader.currentTime = 0;
  g.followers.forEach((f) => { f.currentTime = 0; });
  void g.leader.play().catch(() => {});
}

export function LazyVideo({ src, poster, label, className, sound = false, syncGroup, syncRole = "leader", syncRate, startTogether }: { src: string; poster?: string; label: string; className?: string; sound?: boolean; syncGroup?: string; syncRole?: SyncRole; /** Follower only: seconds of this video per second of the leader (measured); default = ratio of the lengths. */ syncRate?: number; /** Start with every other video of this id at the same moment (see `tryStart`). */ startTogether?: string }) {
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
    const g = startTogether ? startGroup(startTogether) : null;
    const onReady = () => startTogether && tryStart(startTogether);
    if (g) {
      g.members.add(el);
      el.addEventListener("canplay", onReady);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          if (!g || g.started) el.play().catch(() => {});
          else {
            onReady();
            if (!g.timer) g.timer = window.setTimeout(() => startTogether && tryStart(startTogether, true), 4000);
          }
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (g) {
        g.members.delete(el);
        el.removeEventListener("canplay", onReady);
      }
    };
  }, [startTogether]);

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
      autoPlay={startTogether ? false : load || sound}
      preload={startTogether && load ? "auto" : "none"}
      aria-label={label}
      className={cn("size-full object-cover", className)}
    />
  );
}
