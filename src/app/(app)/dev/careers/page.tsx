import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { careerInterests, db } from "@/lib/db";

export const metadata: Metadata = { title: "Open applications" };

/** Developer-only: open applications from /careers. 404 outside development. */
export default async function CareersDevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  let rows: (typeof careerInterests.$inferSelect)[] = [];
  let error: string | null = null;
  try {
    rows = await db().select().from(careerInterests).orderBy(desc(careerInterests.createdAt)).limit(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Database not reachable.";
  }
  return (
    <div className="space-y-10">
      <PageHeader title="Open applications" badge={<Badge>Free · read only</Badge>} description="Messages left on /careers." />
      {error ? <EmptyState title="Could not load" description={error} /> : rows.length === 0 ? <EmptyState title="Nothing yet" description="Submit the form on /careers in database mode and it shows up here." /> : (
        <Card><CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-left text-sm">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Area</th><th className="py-2 pr-4">Link</th><th className="py-2">Message</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {rows.map((r) => (
                <tr key={r.id} className="align-top"><td className="py-2 pr-4 whitespace-nowrap text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="py-2 pr-4">{r.name}</td><td className="py-2 pr-4">{r.email}</td><td className="py-2 pr-4">{r.area}</td><td className="py-2 pr-4 max-w-[12rem] truncate">{r.link}</td><td className="py-2 max-w-[28rem] whitespace-pre-wrap">{r.message}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
