import Link from "next/link";
import { config } from "@/lib/config";

/** Temporary wordmark: initial in an ink square + product name (see lib/config.ts). */
export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface"
      >
        {config.productName.charAt(0)}
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-ink">
        {config.productName}
      </span>
    </Link>
  );
}
