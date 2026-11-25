import {
  FolderOpen,
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

export const settingsNavItem: NavItem = { href: "/app/settings", label: "Settings", icon: Settings };

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // The dashboard is /app itself (25 Nov 2026); every other app page sits under it.
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shown only to administrators (ADMIN_EMAILS); the page is a 404 for anyone else. */
export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };
