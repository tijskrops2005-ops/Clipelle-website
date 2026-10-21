import type { ComponentProps } from "react";
import type { FormatKey } from "@/content/formats";

type Props = ComponentProps<"svg">;

const common = {
  viewBox: "0 0 64 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Small original line illustrations, one per format, in the house style (ink on muted). */
const drawings: Record<FormatKey, (p: Props) => React.JSX.Element> = {
  unboxing: (p) => (
    <svg {...common} {...p}>
      <path d="M14 22h36v18H14z" />
      <path d="M12 16l20-6 20 6-20 6z" />
      <path d="M32 22v18" />
      <path d="M44 10l4-5M52 14l5-2" />
    </svg>
  ),
  testimonial: (p) => (
    <svg {...common} {...p}>
      <circle cx="24" cy="18" r="7" />
      <path d="M12 42c0-7 5-12 12-12s12 5 12 12" />
      <path d="M40 12h14v12H46l-4 4v-4h-2z" />
    </svg>
  ),
  "before-after": (p) => (
    <svg {...common} {...p}>
      <rect x="8" y="12" width="22" height="26" rx="4" />
      <rect x="34" y="12" width="22" height="26" rx="4" />
      <path d="M13 32l4-6 4 4 5-7" strokeDasharray="3 3" />
      <path d="M39 30l4-5 4 3 5-8" />
      <path d="M30 25h4" />
    </svg>
  ),
  "problem-fix": (p) => (
    <svg {...common} {...p}>
      <circle cx="20" cy="24" r="9" />
      <path d="M20 19v6M20 29v.5" />
      <path d="M33 24h8" />
      <path d="M38 20l4 4-4 4" />
      <circle cx="50" cy="24" r="9" />
      <path d="M46 24l3 3 6-6" />
    </svg>
  ),
  "three-reasons": (p) => (
    <svg {...common} {...p}>
      <circle cx="14" cy="13" r="4" />
      <circle cx="14" cy="24" r="4" />
      <circle cx="14" cy="35" r="4" />
      <path d="M24 13h28M24 24h22M24 35h26" />
    </svg>
  ),
  "product-demo": (p) => (
    <svg {...common} {...p}>
      <rect x="10" y="10" width="44" height="28" rx="5" />
      <path d="M27 18l12 6-12 6z" fill="currentColor" stroke="none" />
      <path d="M24 43h16" />
    </svg>
  ),
  "founder-story": (p) => (
    <svg {...common} {...p}>
      <path d="M12 10h26l10 10v18H12z" />
      <path d="M38 10v10h10" />
      <path d="M18 26h20M18 32h14" />
    </svg>
  ),
  offer: (p) => (
    <svg {...common} {...p}>
      <path d="M10 24l16-14h26v28H26z" />
      <circle cx="20" cy="24" r="2.5" />
      <path d="M32 18l14 12M46 18L32 30" />
    </svg>
  ),
};

export function FormatIllustration({ format, ...props }: Props & { format: FormatKey }) {
  const Draw = drawings[format];
  return <Draw {...props} />;
}
