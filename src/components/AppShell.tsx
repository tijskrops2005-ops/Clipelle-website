import { Suspense, type ReactNode } from "react";
import { getScope } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { config } from "@/lib/config";
import { getOrCreateProfile } from "@/lib/data/profile";
import { ensureFreeAd } from "@/lib/billing";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DemoRunner } from "@/components/DemoRunner";

/**
 * Persistent frame for every app page. The sidebar sits on the page background;
 * only cards are white. Below lg the sidebar is replaced by a top bar with a drawer.
 * Navigation components read the pathname (runtime data) so they sit behind Suspense.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const scope = await getScope();
  const user = scope?.user ?? null;
  let workspaces: { id: string; name: string; kind: string; role: string }[] = [];
  if (user && scope && !config.demoMode) {
    // First visit: the profile row, the personal workspace, and the free ad once the e-mail is verified (idempotent, cheap).
    const { ensurePersonalWorkspace, listWorkspacesFor } = await import("@/lib/workspaces");
    await getOrCreateProfile(user).then(() => ensurePersonalWorkspace(user)).then((personal) => ensureFreeAd(user, personal.id)).catch(() => {});
    workspaces = await listWorkspacesFor(user.id).catch(() => []);
  }
  const credits = user && scope && !config.demoMode ? await getCreditBalance(scope.workspaceId).catch(() => null) : null;
  const who = user && scope ? { email: user.email, name: user.name, credits, workspace: { id: scope.workspaceId, name: scope.workspaceName, kind: scope.workspaceKind, role: scope.role }, workspaces } : null;
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
