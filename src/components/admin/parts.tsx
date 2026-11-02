import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small building blocks the admin pages share (2 Nov 2026): a stat card and the table look of CostsPanel. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <p className="label-mono text-muted">{label}</p>
      <p className="mt-2 font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function AdminTable({ children, minWidth = 720, className }: { children: ReactNode; minWidth?: number; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-card bg-surface p-5 shadow-card sm:p-6", className)}>
      <table className="w-full text-[13.5px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={cn("label-mono pb-2 pr-3 text-left font-normal text-muted", right && "text-right", className)}>{children}</th>;
}

export function Td({ children, right, muted, className }: { children?: ReactNode; right?: boolean; muted?: boolean; className?: string }) {
  return <td className={cn("py-2 pr-3 align-top", right && "text-right tabular-nums", muted && "text-muted", className)}>{children}</td>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-t border-divider", className)}>{children}</tr>;
}

export function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);
}

export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function day(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
