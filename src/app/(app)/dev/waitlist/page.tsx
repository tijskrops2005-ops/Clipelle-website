import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { db, waitlist } from "@/lib/db";

export const metadata: Metadata = { title: "Waitlist" };

/** Developer-only: waitlist wishes for the integrations that are not built yet. 404 outside development. */
export default async function WaitlistPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  let rows: (typeof waitlist.$inferSelect)[] = [];
  let error: string | null = null;
  try {
    rows = await db().select().from(waitlist).orderBy(desc(waitlist.createdAt)).limit(500);
  } catch (e) {
    error = e instanceof Error ? e.message : "Database not reachable.";
  }
  return (
    <div className="space-y-10">
      <PageHeader title="Waitlist" badge={<Badge>Free · read only</Badge>} description="E-mails left on /integrations/slack and /integrations/ad-launcher." />
      {error ? (
        <EmptyState title="Could not load" description={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nobody yet" description="Submit the form on an integration page in database mode and it shows up here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full text-left text-sm">
              <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Feature</th><th className="py-2 pr-4">E-mail</th><th className="py-2">Signed in</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="py-2 pr-4">{r.feature}</td>
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className="py-2">{r.userId ? "yes" : "no"}</td>
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
