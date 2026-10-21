import { Suspense, type ReactNode } from "react";
import { getUser } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DemoRunner } from "@/components/DemoRunner";

/**
 * Persistent frame for every app page. The sidebar sits on the page background;
 * only cards are white. Below lg the sidebar is replaced by a top bar with a drawer.
 * Navigation components read the pathname (runtime data) so they sit behind Suspense.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getUser();
  const credits = user ? await getCreditBalance(user.id).catch(() => null) : null;
  const who = user ? { email: user.email, name: user.name, credits } : null;
  return (
    <div className="flex min-h-screen">
      <DemoRunner />
      <div className="hidden lg:block">
        <Suspense fallback={<div className="w-66" aria-hidden />}>
          <Sidebar user={who} />
        </Suspense>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        {/* mobile / tablet top bar */}
        <div className="lg:hidden">
          <Suspense fallback={<div className="h-14" aria-hidden />}>
            <MobileNav user={who} />
          </Suspense>
        </div>
        {/* desktop: the demo pill lives in the sidebar footer; the page starts after a quiet top margin */}
        <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-5 sm:px-6 md:px-8 lg:px-12 lg:pb-20 lg:pt-14">
          {children}
        </div>
      </main>
    </div>
  );
}
