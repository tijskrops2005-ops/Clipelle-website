import type { ComponentProps } from "react";

type Props = ComponentProps<"svg">;

const common = {
  viewBox: "0 0 96 72",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Step 1 — product photo becomes a short clip. */
export function ProductVideoIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* photo card */}
      <rect x="10" y="14" width="34" height="44" rx="6" />
      <circle cx="21" cy="26" r="3.5" />
      <path d="M12 50l10-11 7 7 6-5 9 9" />
      {/* arrow */}
      <path d="M50 36h12" />
      <path d="M58 31l5 5-5 5" />
      {/* clip */}
      <rect x="66" y="12" width="22" height="48" rx="6" />
      <path d="M72 22v28M82 22v28" strokeDasharray="4 4" />
      <path d="M75 33l6 3-6 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Step 2 — a script becomes a talking presenter. */
export function PresenterIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* script lines */}
      <path d="M10 20h22M10 28h18M10 36h22M10 44h14" />
      {/* arrow */}
      <path d="M40 36h10" />
      <path d="M46 31l5 5-5 5" />
      {/* presenter */}
      <circle cx="70" cy="28" r="9" />
      <path d="M54 60c2-10 8-14 16-14s14 4 16 14" />
      {/* voice waves */}
      <path d="M84 24c3 3 3 8 0 11" />
      <path d="M88 20c5 5 5 14 0 19" />
    </svg>
  );
}

/** Step 3 — clips are combined into a 9:16 ad with captions. */
export function FinalVideoIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* two source clips */}
      <rect x="8" y="18" width="16" height="16" rx="4" />
      <rect x="8" y="40" width="16" height="16" rx="4" />
      <path d="M28 26c6 0 8 10 14 10M28 48c6 0 8-12 14-12" />
      {/* phone frame */}
      <rect x="50" y="8" width="30" height="56" rx="7" />
      <path d="M61 30l8 4-8 4z" fill="currentColor" stroke="none" />
      {/* captions */}
      <path d="M57 50h16M60 55h10" />
      {/* sparkle */}
      <path d="M86 14v8M82 18h8" />
    </svg>
  );
}
