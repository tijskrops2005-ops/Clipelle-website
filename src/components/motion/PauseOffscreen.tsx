"use client";

import { useEffect } from "react";

/**
 * Looping animations only run while they are on screen (27 Oct 2026, for phones): one observer
 * watches every element that carries an infinite CSS loop and marks it `data-paused` when it leaves
 * the viewport; the stylesheet then pauses it and everything inside it. New elements (client-side
 * navigation, streamed sections) are picked up by a mutation observer. Nothing to add per component.
 * An element is only marked once React has hydrated it (28 Oct 2026): marking server HTML before
 * hydration made React report an attribute mismatch. Until then its wanted state waits in a queue.
 */
const SELECTOR = ".demo, .loop, .marquee, .glow-field, .stage-glow, .float-soft, .float-card, .playhead-track, .word-cycle, .wave, .fall, .step-glow, .poster-sheen, .caption-pop";

export function PauseOffscreen() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // React keeps its fiber on every element it has hydrated; server HTML without one is not React's yet.
    const isHydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    const waiting = new Map<Element, boolean>();
    let retry = 0;
    const apply = (el: Element, visible: boolean) => {
      if (!isHydrated(el)) {
        waiting.set(el, visible);
        if (!retry) retry = window.setTimeout(flush, 400);
        return;
      }
      waiting.delete(el);
      if (visible) el.removeAttribute("data-paused");
      else el.setAttribute("data-paused", "");
    };
    const flush = () => {
      retry = 0;
      for (const [el, visible] of [...waiting]) {
        if (!el.isConnected) waiting.delete(el);
        else apply(el, visible);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) apply(e.target, e.isIntersecting);
      },
      { rootMargin: "120px 0px" },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll(SELECTOR)) {
        if (seen.has(el)) continue;
        seen.add(el);
        io.observe(el);
      }
    };
    scan();
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        scan();
      }, 150);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      if (pending) window.clearTimeout(pending);
      if (retry) window.clearTimeout(retry);
    };
  }, []);
  return null;
}
