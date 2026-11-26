"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { billingPortalUrl, getInvoices, type InvoiceInfo } from "@/lib/data/settingsClient";
import { config } from "@/lib/config";
import { formatMoney, type Currency } from "@/lib/plans";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  paid: { label: "Paid", tone: "success" },
  open: { label: "Open", tone: "warning" },
  uncollectible: { label: "Unpaid", tone: "danger" },
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Settings → Invoices (26 Nov 2026): every invoice with a PDF, and the portal for card and address changes. */
export function InvoicesSettings() {
  const [data, setData] = useState<{ enabled: boolean; invoices: InvoiceInfo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    getInvoices().then((d) => alive && setData(d)).catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function portal() {
    setBusy(true);
    try {
      window.location.assign(await billingPortalUrl());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the portal.");
      setBusy(false);
    }
  }

  if (error) return <EmptyState title="Could not load invoices" description={error} />;
  const portalButton = data?.enabled && !config.demoMode ? <Button type="button" variant="secondary" size="sm" onClick={portal} disabled={busy}><ExternalLink className="size-4" aria-hidden />Billing details</Button> : null;
  return (
    <SectionCard title="Invoices" description="Every plan payment and credit pack, with a PDF for your records." aside={portalButton}>
      {!data ? (
        <Skeleton className="h-24" />
      ) : data.invoices.length === 0 ? (
        <p className="text-[15px] text-muted">{config.demoMode ? "Demo mode: no invoices." : "No invoices yet. Your first plan or credit pack shows up here."}</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Item</th><th className="py-2 pr-4 font-medium text-right">Amount</th><th className="py-2 pr-4 font-medium">Status</th><th className="py-2 font-medium text-right">PDF</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.invoices.map((i) => {
                const s = STATUS[i.status] ?? { label: i.status, tone: "neutral" as const };
                return (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-ink">{formatDate(i.date)}</td>
                    <td className="py-2.5 pr-4 text-ink"><span className="block">{i.item}</span>{i.number && <span className="text-[12px] text-muted">{i.number}</span>}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right font-medium tabular-nums text-ink">{formatMoney(i.amount, (i.currency === "eur" ? "eur" : "usd") as Currency)}</td>
                    <td className="py-2.5 pr-4"><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td className="py-2.5 text-right">
                      {i.pdf ? (
                        <a href={i.pdf} className="focus-ring inline-flex items-center gap-1.5 rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink" aria-label={`Download invoice ${i.number ?? ""}`}><Download className="size-3.5" aria-hidden />Download</a>
                      ) : i.url ? (
                        <a href={i.url} target="_blank" rel="noreferrer" className="focus-ring rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">View</a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
