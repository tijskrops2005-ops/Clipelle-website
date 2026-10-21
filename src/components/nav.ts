import {
  FolderOpen,
  ShieldCheck,
  LayoutDashboard,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The four app sections, used by the desktop sidebar and the mobile drawer. */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New video", icon: Plus },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shown only to administrators (ADMIN_EMAILS); the page is a 404 for anyone else. */
export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };
