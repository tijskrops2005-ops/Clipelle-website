import Link from "next/link";
import { Lock } from "lucide-react";
import { FEATURE_PLAN, type PlanFeature } from "@/lib/plans";

/** One quiet line under a locked option: what unlocks it, and the way to the plans (26 Oct 2026). */
export function PlanHint({ feature, text }: { feature: PlanFeature; text: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      <span>
        {text}{" "}
        <Link href="/settings/billing" className="font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">
          See {FEATURE_PLAN[feature]}
        </Link>
      </span>
    </p>
  );
}
