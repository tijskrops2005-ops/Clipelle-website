import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { db, demoRequests } from "@/lib/db";

export const metadata: Metadata = { title: "Demo requests" };

/** Developer-only: the demo and contact requests from the public site. 404 outside development. */
export default async function DemoRequestsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  let rows: (typeof demoRequests.$inferSelect)[] = [];
  let error: string | null = null;
  try {
    rows = await db().select().from(demoRequests).orderBy(desc(demoRequests.createdAt)).limit(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Database not reachable.";
  }
  return (
    <div className="space-y-10">
      <PageHeader title="Demo requests" badge={<Badge>Free · read only</Badge>} description="Requests from /demo and /contact. E-mail forwarding needs RESEND_API_KEY and EMAIL_FROM; the column shows whether a mail went out." />
      {error ? (
        <EmptyState title="Could not load" description={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No requests yet" description="Submit the form on /demo in database mode and it shows up here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full text-left text-sm">
              <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Kind</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Goal / message</th><th className="py-2">Mail</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="py-2 pr-4">{r.kind}</td>
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className="py-2 pr-4">{r.company ?? ""}</td>
                    <td className="py-2 pr-4 max-w-md">{[r.goal, r.message].filter(Boolean).join(" · ")}</td>
                    <td className="py-2 text-muted">{r.emailed ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
