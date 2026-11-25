import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { getScope } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { config } from "@/lib/config";
import { getOrCreateProfile } from "@/lib/data/profile";
import { ensureFreeAd } from "@/lib/billing";
import { creditsWorth } from "@/lib/projectCredits";
import { DEMO_BALANCE } from "@/lib/mock/account";
import { deletionDate } from "@/lib/accountDeletion";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DemoRunner } from "@/components/DemoRunner";
import { StatusWatcher } from "@/components/StatusWatcher";
import { PauseOffscreen } from "@/components/motion/PauseOffscreen";
import { ToolSearch } from "@/components/ToolSearch";
import { AssistantPanel } from "@/components/AssistantPanel";
import { TopBar } from "@/components/TopBar";
import { isAdmin } from "@/lib/adminAccess";
import { ViewingBar } from "@/components/ViewingBar";
import { DeletionBanner } from "@/components/DeletionBanner";
import { AppFooter } from "@/components/AppFooter";
import { DraftScopeProvider } from "@/lib/forms/DraftScope";

/**
 * Persistent frame for every app page. The sidebar sits on the page background;
 * only cards are white. Below lg the sidebar is replaced by a top bar with a drawer.
 * Navigation components read the pathname (runtime data) so they sit behind Suspense.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  // Request-time by definition (session, balance, clock): says so explicitly, which also keeps the dev prerender check quiet for the 404 page.
  await connection();
  const scope = await getScope();
  const user = scope?.user ?? null;
  let workspaces: { id: string; name: string; kind: string; role: string }[] = [];
  let deletionAt: string | null = null;
  let credits: number | null = null;
  if (user && scope && !config.demoMode) {
    // First visit: the profile row, the personal workspace, and the free credits once the e-mail is verified (idempotent, cheap).
    // Side by side (25 Nov 2026, speed): these do not depend on each other, so the page waits for the slowest one, not the sum.
    const { ensurePersonalWorkspace, listWorkspacesFor } = await import("@/lib/workspaces");
    const [profile, list, balance] = await Promise.all([
      getOrCreateProfile(user).then((p) => ensurePersonalWorkspace(user).then((personal) => ensureFreeAd(user, personal.id)).catch(() => {}).then(() => p)).catch(() => null),
      listWorkspacesFor(user.id).catch(() => []),
      getCreditBalance(scope.workspaceId).catch(() => null),
    ]);
    if (profile?.deletionRequestedAt && !scope.viewing) deletionAt = deletionDate(profile.deletionRequestedAt).toISOString();
    workspaces = list;
    credits = balance;
  } else if (user && scope) {
    // Demo mode shows the one demo balance everywhere (src/lib/mock/account.ts).
    credits = DEMO_BALANCE;
  }
  const who = user && scope ? { email: user.email, name: user.name, credits, planKey: scope.planKey, workspace: { id: scope.workspaceId, name: scope.workspaceName, kind: scope.workspaceKind, role: scope.role }, workspaces, isAdmin: !config.demoMode && isAdmin(user.email) } : null;
  // Form drafts belong to this user in this workspace (2 Nov 2026, src/lib/forms/formDraft.ts).
  const draftScope = user && scope ? { userId: user.id, workspaceId: scope.workspaceId } : null;
  return (
    <DraftScopeProvider scope={draftScope}>
    <div className="flex min-h-screen bg-surface">
      <DemoRunner />
      <StatusWatcher />
      <PauseOffscreen />
      <ToolSearch />
      <AssistantPanel />
      {/* The sidebar stays in view while the page scrolls; its middle scrolls on its own when the list is long. */}
      <div className="sticky top-0 hidden h-screen lg:block">
        <Suspense fallback={<div className="h-full w-64 bg-ink" aria-hidden />}>
          <Sidebar user={who} />
        </Suspense>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        {scope?.viewing && <ViewingBar viewing={scope.viewing} />}
        {deletionAt && <DeletionBanner deletionAt={deletionAt} />}
        {/* mobile / tablet top bar */}
        <div className="lg:hidden">
          <Suspense fallback={<div className="h-14" aria-hidden />}>
            <MobileNav user={who} />
          </Suspense>
        </div>
        {/* desktop: section, credits, tool search, support and updates */}
        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-14" aria-hidden />}>
            <TopBar credits={credits !== null ? { balance: credits, approx: creditsWorth(credits, config.features.ads) } : null} user={who ? { email: who.email, name: who.name, credits: who.credits } : null} />
          </Suspense>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-5 sm:px-6 md:px-8 lg:px-10 lg:pb-20 lg:pt-9">
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
    </DraftScopeProvider>
  );
}
