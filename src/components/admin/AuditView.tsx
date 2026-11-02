import Link from "next/link";
import { AUDIT_ACTIONS, auditActionLabel, type AuditEntry, type AuditFilters } from "@/lib/adminAudit";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/DemoModeBadge";
import { AdminTable, Td, Th, Tr, when } from "./parts";

/**
 * /admin/audit (2 Nov 2026): what administrators did, newest first, with plain GET filters so the
 * page works without JavaScript and every view has an address.
 */
export function AuditView({ entries, filters, admins, demo }: { entries: AuditEntry[]; filters: AuditFilters; admins: string[]; demo?: boolean }) {
  const input = "focus-ring h-9 rounded-control border border-border bg-surface px-3 text-[13.5px] text-ink";
  return (
    <div className="space-y-8">
      <PageHeader title="Audit log" badge={demo ? <DemoBadge>Demo</DemoBadge> : undefined} description="Every change an administrator made to a customer, with the reason. Nothing here is ever deleted." actions={<Button href="/admin/customers" variant="secondary" size="sm">Customers</Button>} />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-card bg-surface p-4 shadow-card">
        <label className="grid gap-1 text-[12.5px] text-muted">
          Administrator
          <select name="admin" defaultValue={filters.admin ?? ""} className={input}>
            <option value="">All</option>
            {admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[12.5px] text-muted">
          Action
          <select name="action" defaultValue={filters.action ?? ""} className={input}>
            <option value="">All</option>
            {AUDIT_ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[12.5px] text-muted">
          Customer
          <input name="customer" defaultValue={filters.customer ?? ""} placeholder="Name, e-mail or id" className={input} />
        </label>
        <label className="grid gap-1 text-[12.5px] text-muted">
          From
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-[12.5px] text-muted">
          To
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={input} />
        </label>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
        <Button href="/admin/audit" variant="ghost" size="sm">Clear</Button>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="Nothing in the log" description="Admin actions on customers show up here as they happen." />
      ) : (
        <AdminTable minWidth={900}>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Administrator</Th>
              <Th>Action</Th>
              <Th>Customer</Th>
              <Th>Change</Th>
              <Th>Reason</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <Tr key={e.id}>
                <Td muted className="whitespace-nowrap">{when(e.createdAt)}</Td>
                <Td>{e.adminEmail}</Td>
                <Td>{auditActionLabel(e.action)}</Td>
                <Td>{e.targetUserId ? <Link href={`/admin/customers/${e.targetUserId}`} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{e.targetLabel ?? e.targetUserId}</Link> : e.targetLabel ?? "—"}</Td>
                <Td muted><Change oldValue={e.oldValue} newValue={e.newValue} /></Td>
                <Td>{e.reason ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}

/** "balance 38 → −12 · credits −50": the old and new values side by side, in plain text. */
function Change({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const o = (oldValue && typeof oldValue === "object" ? oldValue : {}) as Record<string, unknown>;
  const n = (newValue && typeof newValue === "object" ? newValue : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])];
  if (keys.length === 0) return <>—</>;
  return (
    <span className="font-mono text-[12.5px] tabular-nums">
      {keys.map((k) => `${k} ${k in o ? String(o[k]) : "·"}${k in n ? ` → ${String(n[k])}` : ""}`).join(" · ")}
    </span>
  );
}
