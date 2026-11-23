"use client";

import { useEffect, useState } from "react";
import { getUsage, type UsageInfo } from "@/lib/data/settingsClient";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const kindLabel: Record<string, string> = { grant_free: "Free credits", grant_trial: "Free trial credits", grant_subscription: "Plan credits", grant_topup: "Credit pack", grant_manual: "Added", reserve: "Reserved for a project", settle: "Unused credits returned", refund: "Refunded (project failed)", expire: "Expired" };

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
          <p className="text-[13px] text-muted">Credits available</p>
          {usage ? <p className="text-display mt-2">{usage.balance.toLocaleString("en-US")}</p> : <Skeleton className="mt-3 h-10 w-24" />}
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card">
          <p className="text-[13px] text-muted">Projects this month</p>
          {usage ? <p className="text-display mt-2">{usage.projectsThisMonth}</p> : <Skeleton className="mt-3 h-10 w-16" />}
        </div>
      </div>

      <SectionCard title="Used per project" description="Last 90 days. A failed project shows 0: its credits came back.">
        {!usage ? (
          <Skeleton className="h-24" />
        ) : usage.projects.length === 0 ? (
          <p className="text-[15px] text-muted">No finished projects yet.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1"><table className="w-full min-w-[320px] text-left text-sm">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4 font-medium">Project</th><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 font-medium text-right">Credits</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {usage.projects.map((p) => (
                <tr key={p.projectId}><td className="py-2.5 pr-4 text-ink">{p.name}</td><td className="py-2.5 pr-4 text-muted">{p.workflow === "ad" ? "Ad" : p.workflow === "translate" ? "Translation" : ""}</td><td className="py-2.5 text-right font-medium text-ink">{p.credits.toLocaleString("en-US")}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </SectionCard>

      <SectionCard title="Credit history">
        {!usage ? (
          <Skeleton className="h-24" />
        ) : usage.ledger.length === 0 ? (
          <p className="text-[15px] text-muted">No credits yet.</p>
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
