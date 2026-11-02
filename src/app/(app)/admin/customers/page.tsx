import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoading from "../loading";
import { requireAdmin } from "@/lib/admin";
import { listCustomers } from "@/lib/adminCustomers";
import { CUSTOMER_FILTERS, customerStats, filterCounts, matchesFilter, matchesQuery, paginate, sortCustomers, type CustomerFilter, type CustomerSort } from "@/lib/customerFilters";
import { config } from "@/lib/config";
import { mockCustomers } from "@/lib/mock/admin";
import { CustomersView } from "@/components/admin/CustomersView";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };

const PER_PAGE = 50;

export default function AdminCustomersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <CustomersInner {...props} />
    </Suspense>
  );
}

async function CustomersInner({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = (CUSTOMER_FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as CustomerFilter;
  const sort: CustomerSort = sp.sort === "oldest" ? "oldest" : "newest";
  const query = (sp.q ?? "").trim().slice(0, 80);
  const all = config.demoMode ? mockCustomers : await listCustomers();
  const visible = sortCustomers(all.filter((c) => matchesFilter(c, filter) && matchesQuery(c, query)), sort);
  const paged = paginate(visible, Number(sp.page ?? 1), PER_PAGE);
  return <CustomersView stats={customerStats(all)} counts={filterCounts(all.filter((c) => matchesQuery(c, query)))} rows={paged.rows} filter={filter} query={query} sort={sort} page={paged.page} pages={paged.pages} total={paged.total} demo={config.demoMode} />;
}
