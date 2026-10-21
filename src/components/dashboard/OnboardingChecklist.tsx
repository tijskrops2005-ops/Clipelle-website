"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { getOnboarding, type OnboardingState } from "@/lib/data/client";
import { useProjects } from "@/lib/data/client";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "reelay.onboarding.dismissed.v1";

const ITEMS: { key: keyof OnboardingState; label: string; text: string; href: string }[] = [
  { key: "firstAd", label: "Make your first ad", text: "One product photo and a few sentences; the rest runs on its own.", href: "/new/ad" },
  { key: "brand", label: "Set your brand style", text: "Accent colour, caption look, font and logo, prefilled on every ad.", href: "/settings/brand" },
  { key: "translation", label: "Translate a video", text: "A video you own, or an ad you made here, into other languages.", href: "/new/translate" },
  { key: "team", label: "Invite a team member", text: "Share one credit pool with your team (Business plan).", href: "/settings/team" },
  { key: "apiKey", label: "Create an API key", text: "Make videos from your own code or an AI assistant (paid plans).", href: "/settings/api" },
];

/** First-time checklist on the dashboard: disappears when everything is done or when dismissed. */
export function OnboardingChecklist() {
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
  const done = ITEMS.filter((i) => state[i.key]).length;
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
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[17px] font-semibold text-ink">Getting started</p>
            <p className="text-[13px] text-muted">{done} of {ITEMS.length} done. This list disappears when everything is checked, or when you close it.</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Hide the checklist" className="focus-ring rounded-full p-1 text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ITEMS.map((item) => {
            const ok = state[item.key];
            return (
              <li key={item.key}>
                <Link href={item.href} className={cn("focus-ring flex h-full items-start gap-2.5 rounded-panel border p-3 transition-colors duration-150", ok ? "border-success/30 bg-success/5" : "border-border bg-surface-muted/60 hover:bg-surface")}>
                  {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                  <span>
                    <span className={cn("block text-sm font-medium", ok ? "text-ink/70 line-through" : "text-ink")}>{item.label}</span>
                    <span className="block text-[12px] leading-snug text-muted">{item.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
