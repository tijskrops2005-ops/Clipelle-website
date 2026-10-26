"use client";

import { useEffect, useState } from "react";
import { getUsage, type UsageInfo } from "@/lib/data/settingsClient";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { DemoBadge } from "@/components/DemoModeBadge";
import { EmptyState } from "@/components/ui/EmptyState";

const kindLabel: Record<string, string> = { grant_free: "Free credits", grant_subscription: "Plan credits", grant_topup: "Credit pack", grant_manual: "Added", reserve: "Reserved for a project", settle: "Unused credits returned", refund: "Refunded (project failed)", expire: "Expired" };

/** Usage per project in credits and the credit ledger, for the current workspace. */
export function UsageSettings() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getUsage().then((u) => alive && setUsage(u)).catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  if (error) return <EmptyState title="Could not load usage" description={error} />;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <p className="label-mono text-muted">Credits available</p>
          {usage ? <p className="text-display mt-2">{usage.balance.toLocaleString("en-US")}</p> : <Skeleton className="mt-3 h-10 w-24" />}
          <p className="mt-1 text-[13px] text-muted">One credit is one second of translated video; an ad uses 2 per second.</p>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card">
          <p className="label-mono text-muted">Projects this month</p>
          {usage ? <p className="text-display mt-2">{usage.projectsThisMonth}</p> : <Skeleton className="mt-3 h-10 w-16" />}
          <p className="mt-1 text-[13px] text-muted">Ads and translations started since the 1st.</p>
        </div>
      </div>

      <SectionCard title="Per project" description="Credits used by each project in the last 90 days. A project that failed shows 0: its credits were refunded." aside={<DemoBadge>Demo numbers</DemoBadge>}>
        {!usage ? (
          <Skeleton className="h-24" />
        ) : usage.projects.length === 0 ? (
          <p className="text-[15px] text-muted">No projects with credits yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4 font-medium">Project</th><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 font-medium text-right">Credits</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {usage.projects.map((p) => (
                <tr key={p.projectId}><td className="py-2.5 pr-4 text-ink">{p.name}</td><td className="py-2.5 pr-4 text-muted">{p.workflow === "ad" ? "Ad" : p.workflow === "translate" ? "Translation" : ""}</td><td className="py-2.5 text-right font-medium text-ink">{p.credits.toLocaleString("en-US")}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Credit history" description="Every change to your balance.">
        {!usage ? (
          <Skeleton className="h-24" />
        ) : usage.ledger.length === 0 ? (
          <p className="text-[15px] text-muted">No credits yet. Verify your e-mail for 30 free credits, or pick a plan in Billing.</p>
        ) : (
          <ul className="divide-y divide-divider">
            {usage.ledger.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink">{kindLabel[l.kind] ?? l.kind}{l.note ? <span className="text-muted"> · {l.note}</span> : null}</span>
                  <span className="block text-[13px] text-muted">{new Date(l.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{l.expiresAt ? ` · valid until ${new Date(l.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</span>
                </span>
                <span className={l.credits >= 0 ? "font-medium text-success" : "font-medium text-ink"}>{l.credits >= 0 ? "+" : ""}{l.credits.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
