import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CUSTOMER_FILTERS, type CustomerFilter, type CustomerRow, type CustomerSort } from "@/lib/customerFilters";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/DemoModeBadge";
import { cn } from "@/lib/utils";
import { AdminTable, StatCard, Td, Th, Tr, day, money } from "./parts";

type Props = {
  stats: { users: number; paying: number; revenueCents: number; creditsOutstanding: number };
  counts: Record<CustomerFilter, number>;
  rows: CustomerRow[];
  filter: CustomerFilter;
  query: string;
  sort: CustomerSort;
  page: number;
  pages: number;
  total: number;
  demo?: boolean;
};

function href(p: { filter?: CustomerFilter; q?: string; sort?: CustomerSort; page?: number }) {
  const sp = new URLSearchParams();
  if (p.filter && p.filter !== "all") sp.set("filter", p.filter);
  if (p.q) sp.set("q", p.q);
  if (p.sort && p.sort !== "newest") sp.set("sort", p.sort);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return `/admin/customers${s ? `?${s}` : ""}`;
}

/** /admin/customers (2 Nov 2026): four numbers, filter chips with counts, search, the table, pages. Plain links and a GET form: every view has an address. */
export function CustomersView({ stats, counts, rows, filter, query, sort, page, pages, total, demo }: Props) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        badge={demo ? <DemoBadge>Demo</DemoBadge> : undefined}
        description={`${stats.users.toLocaleString("en-US")} accounts. Amounts include VAT.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/dashboard" variant="secondary" size="sm">Back to app</Button>
            <Button href="/admin/payouts" variant="primary" size="sm">Payouts</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users.toLocaleString("en-US")} />
        <StatCard label="Paying" value={stats.paying.toLocaleString("en-US")} hint="Paid at least once" />
        <StatCard label="Revenue" value={money(stats.revenueCents)} hint="All payments, including VAT" />
        <StatCard label="Credits outstanding" value={stats.creditsOutstanding.toLocaleString("en-US")} hint="Sum of all balances" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
          {CUSTOMER_FILTERS.map((f) => (
            <Link key={f.key} href={href({ filter: f.key, q: query, sort })} aria-current={filter === f.key ? "page" : undefined} className={cn("focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-150", filter === f.key ? "border-ink bg-ink text-surface" : "border-border bg-surface text-muted hover:text-ink")}>
              {f.label}
              <span className={cn("tabular-nums", filter === f.key ? "text-surface/70" : "text-muted/70")}>{counts[f.key]}</span>
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-center gap-2">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <input name="q" defaultValue={query} placeholder="Search name or e-mail" aria-label="Search customers" className="focus-ring h-9 w-56 rounded-full border border-border bg-surface px-3.5 text-[13px] text-ink" />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No customers match" description="Try another filter or search word." />
      ) : (
        <AdminTable minWidth={860}>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>
                <Link href={href({ filter, q: query, sort: sort === "newest" ? "oldest" : "newest" })} className="focus-ring inline-flex items-center gap-1 rounded-control hover:text-ink">
                  Signed up {sort === "newest" ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />}
                </Link>
              </Th>
              <Th>Plan</Th>
              <Th>Via</Th>
              <Th right>Balance</Th>
              <Th right>Paid</Th>
              <Th>Last active</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const plan = planByKey(c.planKey);
              return (
                <Tr key={c.userId} className="hover:bg-surface-muted/50">
                  <Td>
                    <Link href={`/admin/customers/${c.userId}`} className="focus-ring block rounded-control">
                      <span className="block font-medium text-ink">{c.name ?? c.email}</span>
                      {c.name && <span className="block text-[12.5px] text-muted">{c.email}</span>}
                      {c.deletionRequestedAt && <span className="label-mono text-danger">deletion requested</span>}
                    </Link>
                  </Td>
                  <Td muted className="whitespace-nowrap">{day(c.signedUpAt)}</Td>
                  <Td>
                    <span className="block">{plan?.name ?? c.planKey}</span>
                    {(c.subscriptionStatus === "canceling" || c.subscriptionStatus === "canceled") && <span className="block text-[12px] text-muted">canceled</span>}
                  </Td>
                  <Td muted>{c.referredBy ?? "—"}</Td>
                  <Td right className={c.balance < 0 ? "text-danger" : undefined}>{c.balance.toLocaleString("en-US")}</Td>
                  <Td right>{c.paidCents ? money(c.paidCents) : "—"}</Td>
                  <Td muted className="whitespace-nowrap">{day(c.lastActiveAt)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-[13px] text-muted">
          <span>{total.toLocaleString("en-US")} customers · page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button href={href({ filter, q: query, sort, page: page - 1 })} variant="secondary" size="sm">Previous</Button>}
            {page < pages && <Button href={href({ filter, q: query, sort, page: page + 1 })} variant="secondary" size="sm">Next</Button>}
          </div>
        </nav>
      )}
    </div>
  );
}
