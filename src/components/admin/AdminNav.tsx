"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/costs", label: "Costs" },
  { href: "/admin/quality", label: "Quality" },
];

/** The admin area's own row of links (2 Nov 2026), above every admin page. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mt-2 mb-8 flex flex-wrap items-center gap-1 border-b border-divider pb-3">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cn("focus-ring rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-150", active ? "bg-ink text-surface" : "text-muted hover:bg-surface-muted hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
