"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { getOnboarding, type OnboardingState } from "@/lib/data/client";
import { useProjects } from "@/lib/data/client";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { hasFeature, type PlanFeature } from "@/lib/plans";

const DISMISS_KEY = "clipelle.onboarding.dismissed.v1";

type ItemKey = keyof OnboardingState | "secondLanguage";
type Item = { key: ItemKey; label: string; text: string; href: string; ads?: boolean; needs?: PlanFeature };

/**
 * Steps this customer can take today (23 Nov 2026): a free account used to be asked to invite a team
 * member and make an API key, both paid. Team and API show only on a plan that has them; the ad items
 * only while ads are on (27 Oct 2026).
 */
const ALL_ITEMS: Item[] = [
  { key: "translation", label: "Translate your first video", text: "A video you own, into another language, with the speaker's own voice.", href: "/new/translate" },
  { key: "secondLanguage", label: "Add a second language", text: "Pick two languages on one video; each gets its own captions.", href: "/new/translate" },
  { key: "brand", label: "Set your caption colours", text: "The colours every new translation starts with.", href: "/settings/brand" },
  { key: "firstAd", label: "Make your first ad", text: "One product photo and a few sentences; the rest runs on its own.", href: "/new/ad", ads: true },
  { key: "team", label: "Invite a team member", text: "Share one credit pool with your team.", href: "/settings/team", needs: "team" },
  { key: "apiKey", label: "Create an API key", text: "Start videos from your own code or an AI assistant.", href: "/settings/api", needs: "api" },
];

/** First-time checklist on the dashboard: disappears when everything is done or when dismissed. */
export function OnboardingChecklist({ planKey }: { planKey?: string | null }) {
  const ITEMS = ALL_ITEMS.filter((i) => (!i.ads || config.features.ads) && (!i.needs || hasFeature(planKey, i.needs)));
  const projects = useProjects();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    // Read after mount (never during render, so server and client agree), then decide.
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      let hidden = false;
      try {
        hidden = window.localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        hidden = false;
      }
      setDismissed(hidden);
    });
    return () => {
      alive = false;
    };
  }, []);
  // Refreshes when the project list changes (a first ad or translation appears).
  useEffect(() => {
    let alive = true;
    getOnboarding().then((s) => alive && setState(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [projects.length]);

  if (dismissed !== false || !state) return null;
  // A second language shows in the customer's own projects (the demo's seed projects do not count).
  const own = projects.filter((p) => p.workflow === "translate" && !(config.demoMode && p.id.startsWith("prj_0")));
  const secondLanguage = own.some((p) => p.workflow === "translate" && p.targetLanguages.length > 1) || own.length > 1;
  const isDone = (key: ItemKey) => (key === "secondLanguage" ? secondLanguage : state[key]);
  const done = ITEMS.filter((i) => isDone(i.key)).length;
  if (done === ITEMS.length) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px] font-semibold text-ink">Getting started</p>
          <button type="button" onClick={dismiss} aria-label="Hide the checklist" className="focus-ring rounded-full p-1 text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ul className="mt-3 divide-y divide-divider">
          {ITEMS.map((item) => {
            const ok = isDone(item.key);
            return (
              <li key={item.key}>
                <Link href={item.href} className="focus-ring -mx-2 flex items-center gap-3 rounded-control px-2 py-2.5 text-sm transition-colors duration-150 hover:bg-surface-muted/60">
                  {ok ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : <Circle className="size-4 shrink-0 text-muted" aria-hidden />}
                  <span className={cn("font-medium", ok ? "text-muted line-through" : "text-ink")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
