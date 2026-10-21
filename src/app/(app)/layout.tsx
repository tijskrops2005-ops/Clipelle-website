import { AppShell } from "@/components/AppShell";

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
