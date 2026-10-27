"use client";

import { useEffect } from "react";

/**
 * Looping animations only run while they are on screen (27 Oct 2026, for phones): one observer
 * watches every element that carries an infinite CSS loop and marks it `data-paused` when it leaves
 * the viewport; the stylesheet then pauses it and everything inside it. New elements (client-side
 * navigation, streamed sections) are picked up by a mutation observer. Nothing to add per component.
 */
const SELECTOR = ".demo, .loop, .marquee, .glow-field, .stage-glow, .float-soft, .float-card, .playhead-track, .word-cycle, .wave, .fall, .step-glow, .poster-sheen, .caption-pop";

export function PauseOffscreen() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.removeAttribute("data-paused");
          else e.target.setAttribute("data-paused", "");
        }
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
    };
  }, []);
  return null;
}
