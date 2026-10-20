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

/** Workflow B — a video with speech becomes the same video in another language. */
export function TranslateIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* source clip with speech bubble */}
      <rect x="8" y="16" width="30" height="40" rx="6" />
      <circle cx="23" cy="31" r="5" />
      <path d="M15 48c2-5 5-7 8-7s6 2 8 7" />
      <path d="M30 14h12a4 4 0 0 1 4 4v4l-5-3h-7a4 4 0 0 1-4-4z" />
      {/* arrow */}
      <path d="M44 36h8" />
      <path d="M48 31l5 5-5 5" />
      {/* translated clip with captions */}
      <rect x="58" y="16" width="30" height="40" rx="6" />
      <circle cx="73" cy="31" r="5" />
      <path d="M65 48c2-5 5-7 8-7s6 2 8 7" />
      <path d="M63 60h20M67 65h12" />
      {/* language mark */}
      <path d="M78 10h10M83 6v4M80 19c3-2 5-5 6-9M86 19c-2-2-3-4-4-6" />
    </svg>
  );
}

/** Workflow A, step 1 — product information becomes a script. */
export function ScriptIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* product card */}
      <rect x="8" y="18" width="26" height="36" rx="6" />
      <circle cx="16" cy="28" r="3" />
      <path d="M10 46l7-8 5 5 4-3 6 6" />
      {/* arrow */}
      <path d="M40 36h10" />
      <path d="M46 31l5 5-5 5" />
      {/* script sheet */}
      <rect x="56" y="12" width="32" height="48" rx="6" />
      <path d="M62 22h20M62 29h14M62 36h20M62 43h11M62 50h16" />
      {/* sparkle */}
      <path d="M86 8v6M83 11h6" />
    </svg>
  );
}

/** Workflow B, step 1 — a video file is uploaded and checked. */
export function UploadIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      <rect x="22" y="22" width="52" height="40" rx="8" />
      <path d="M48 52V30" />
      <path d="M40 38l8-8 8 8" />
      <path d="M30 62h36" strokeDasharray="4 4" />
      <path d="M78 18l3 3 6-6" />
    </svg>
  );
}

/** Workflow B, step 3 — captions and the vertical 9:16 format. */
export function CaptionsIllustration(props: Props) {
  return (
    <svg {...common} {...props}>
      {/* wide source */}
      <rect x="6" y="22" width="34" height="24" rx="5" />
      <path d="M44 34h8" />
      <path d="M48 29l5 5-5 5" />
      {/* 9:16 phone with captions */}
      <rect x="60" y="8" width="30" height="56" rx="7" />
      <circle cx="75" cy="28" r="5" />
      <path d="M66 44c2-5 5-7 9-7s7 2 9 7" />
      <path d="M66 52h18M69 57h12" />
    </svg>
  );
}
