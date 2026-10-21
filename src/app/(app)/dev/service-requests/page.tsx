import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { db, serviceRequests } from "@/lib/db";

export const metadata: Metadata = { title: "Service requests" };

/** Developer-only: requests for the managed service. 404 outside development. */
export default async function ServiceRequestsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  let rows: (typeof serviceRequests.$inferSelect)[] = [];
  let error: string | null = null;
  try {
    rows = await db().select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Database not reachable.";
  }
  return (
    <div className="space-y-10">
      <PageHeader title="Service requests" badge={<Badge>Free · read only</Badge>} description="Requests from /services/done-for-you." />
      {error ? <EmptyState title="Could not load" description={error} /> : rows.length === 0 ? <EmptyState title="Nothing yet" description="Submit the form on /services/done-for-you in database mode." /> : (
        <Card><CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-left text-sm">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Sells</th><th className="py-2 pr-4">Ads/month</th><th className="py-2">Message</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {rows.map((r) => (
                <tr key={r.id} className="align-top"><td className="py-2 pr-4 whitespace-nowrap text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="py-2 pr-4">{r.name}</td><td className="py-2 pr-4">{r.email}</td><td className="py-2 pr-4">{r.company}</td><td className="py-2 pr-4">{r.sells}</td><td className="py-2 pr-4">{r.adsPerMonth}</td><td className="py-2 max-w-[24rem] whitespace-pre-wrap">{r.message}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
