import {
  FolderOpen,
  House,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Sidebar and mobile drawer: Home (the public site) and the app sections. The tools themselves
 * (Ad from a photo, …) come from src/components/tools.ts; "Create new video" is the accent button.
 */
export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
];

export const settingsNavItem: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shown only to administrators (ADMIN_EMAILS); the page is a 404 for anyone else. */
export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };
