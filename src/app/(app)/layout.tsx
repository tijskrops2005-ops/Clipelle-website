import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

/** The app is personal: kept out of search engines (25 Nov 2026); titles read "Projects · Clipelle". */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Every app page is personal (session cookie, database) and rendered on request. `instant = false`
 * tells the production build that these routes may block on that data instead of demanding a static
 * shell with Suspense; without it the build refuses to prerender the group, and with a streamed shell
 * a `notFound()` inside a page would answer 200 instead of 404.
 */
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
