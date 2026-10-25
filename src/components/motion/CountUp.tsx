"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up once when it scrolls into view. The real value is what renders by
 * default (server, no JavaScript, "reduce motion"); only while counting is an in-between number
 * shown, so a changed value is never hidden behind an old one.
 */
export function CountUp({ value, duration = 1100, decimals = 0, suffix = "", className }: { value: number; duration?: number; /** Show value / 10^decimals, e.g. 45 with 1 → "4.5". */ decimals?: number; suffix?: string; className?: string }) {
  const format = (n: number) => (decimals ? (n / 10 ** decimals).toFixed(decimals) : n.toLocaleString("en-US")) + suffix;
  const ref = useRef<HTMLSpanElement>(null);
  const [counting, setCounting] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    // Small numbers (1, 2, …) are not worth counting: they would only flash 0 first.
    if (!el || value < 10) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) {
          setCounting(Math.round(value * eased));
          frame = requestAnimationFrame(tick);
        } else {
          setCounting(null); // done: show the real value again
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    // Start from zero only once we know the animation will run.
    frame = requestAnimationFrame(() => {
      setCounting(0);
      io.observe(el);
    });
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      setCounting(null);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(counting ?? value)}
    </span>
  );
}
