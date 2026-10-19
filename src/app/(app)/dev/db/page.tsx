import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DbStatusPanel } from "./DbStatusPanel";

export const metadata: Metadata = { title: "Database status" };

/** Developer-only: database connection, tables and migrations. 404 outside development. */
export default function DbStatusPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="space-y-10">
      <PageHeader
        title="Database status"
        badge={<Badge>Free · read only</Badge>}
        description="Checks the connection to the Supabase Postgres database, lists the tables with their row counts and the migrations that have been applied. Nothing is written."
      />
      <DbStatusPanel />
    </div>
  );
}
