"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Gauge, KeyRound, Link2, Palette, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "Profile", icon: UserRound },
  { href: "/settings/brand", label: "Brand", icon: Palette },
  { href: "/settings/usage", label: "Usage", icon: Gauge },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/api", label: "API keys", icon: KeyRound },
  { href: "/settings/connections", label: "Connections", icon: Link2 },
];

/** Side menu of the settings pages; a pill row on phones. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1 lg:flex-col lg:rounded-card lg:bg-transparent lg:p-0">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("focus-ring flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 lg:rounded-control lg:px-3", active ? "bg-surface text-ink shadow-soft lg:shadow-card" : "text-muted hover:text-ink lg:hover:bg-ink/5")}
          >
            <Icon className={cn("size-4", active ? "text-accent" : "text-muted")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
