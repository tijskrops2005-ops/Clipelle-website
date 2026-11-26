import {
  CreditCard,
  FolderOpen,
  Gauge,
  Handshake,
  MessageSquareHeart,
  Receipt,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Sidebar and mobile drawer: the app sections (the logo links to the public site; the Home link
 * went on 2 Nov 2026). The tools themselves (Ad from a photo, …) come from src/components/tools.ts;
 * "Create new video" is the accent button.
 */
export const navItems: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  // The edit screen is the "Video editor" tool since 25 Nov 2026 (src/components/tools.ts).
];

/**
 * The account group (26 Nov 2026, Tijs, after splister.com/app): the money and the relationship in
 * the sidebar itself, above Settings. Subscription and Usage are settings pages; Invoices lists the
 * Stripe invoices; Feedback and Affiliate are their own pages.
 */
export const accountNavItems: NavItem[] = [
  { href: "/app/settings/billing", label: "Subscription", icon: CreditCard },
  { href: "/app/settings/invoices", label: "Invoices", icon: Receipt },
  { href: "/app/settings/usage", label: "Usage", icon: Gauge },
  { href: "/app/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/app/affiliate", label: "Affiliate", icon: Handshake },
];

export const settingsNavItem: NavItem = { href: "/app/settings", label: "Settings", icon: Settings };

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // The dashboard is /app itself (25 Nov 2026); every other app page sits under it.
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Settings lights up for its own pages only: a settings page with its own sidebar row (Subscription, Invoices, Usage) lights that row. */
export function isSettingsActive(pathname: string) {
  return isActivePath(pathname, settingsNavItem.href) && !accountNavItems.some((i) => isActivePath(pathname, i.href));
}

/** Shown only to administrators (ADMIN_EMAILS); the page is a 404 for anyone else. */
export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };
