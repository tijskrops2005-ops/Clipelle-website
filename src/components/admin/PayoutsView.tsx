import { PARTNER_COMMISSION, type PartnerMonth } from "@/lib/payouts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/DemoModeBadge";
import { AdminTable, StatCard, Td, Th, Tr, money } from "./parts";

/** /admin/payouts (2 Nov 2026): what referred customers paid per partner and month, and 25% of the subscription part. An estimate only; the partner platform pays out. */
export function PayoutsView({ rows, platformUrl, demo }: { rows: PartnerMonth[]; platformUrl: string; demo?: boolean }) {
  const byCurrency = new Map<string, number>();
  for (const r of rows) byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + r.commissionCents);
  const partners = new Set(rows.map((r) => r.partner)).size;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Payouts"
        badge={demo ? <DemoBadge>Demo</DemoBadge> : <Badge tone="warning" className="translate-y-1">Estimate</Badge>}
        description={`${Math.round(PARTNER_COMMISSION * 100)}% of the subscription payments of referred customers, per partner and month. Credit packs and auto-reloads do not count. Estimate. Payouts happen in Reditus.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/admin/customers" variant="secondary" size="sm">Customers</Button>
            <Button href={platformUrl} variant="primary" size="sm" target="_blank" rel="noopener">Open Reditus</Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Partners with payments" value={partners} />
        {[...byCurrency.entries()].map(([cur, cents]) => <StatCard key={cur} label={`Commission (${cur.toUpperCase()})`} value={money(cents, cur)} hint="all months together" />)}
        {byCurrency.size === 0 && <StatCard label="Commission" value="—" hint="nothing referred yet" />}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No referred payments yet" description="Customers who sign up through a partner link (?ref=…) show up here once they pay for a plan." />
      ) : (
        <AdminTable minWidth={640}>
          <thead><tr><Th>Month</Th><Th>Partner</Th><Th right>Customers</Th><Th right>Subscriptions</Th><Th right>Commission</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={`${r.partner}-${r.month}-${r.currency}`}><Td muted className="whitespace-nowrap">{r.month}</Td><Td>{r.partner}</Td><Td right>{r.customers}</Td><Td right>{money(r.subscriptionCents, r.currency)}</Td><Td right className="font-semibold">{money(r.commissionCents, r.currency)}</Td></Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
