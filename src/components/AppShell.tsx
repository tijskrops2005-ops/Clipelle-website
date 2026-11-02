import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { getScope } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { config } from "@/lib/config";
import { getOrCreateProfile } from "@/lib/data/profile";
import { ensureFreeAd } from "@/lib/billing";
import { adCredits } from "@/lib/plans";
import { deletionDate } from "@/lib/accountDeletion";
import { supportEmail } from "@/lib/brand";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DemoRunner } from "@/components/DemoRunner";
import { StatusWatcher } from "@/components/StatusWatcher";
import { PauseOffscreen } from "@/components/motion/PauseOffscreen";
import { ToolSearch } from "@/components/ToolSearch";
import { TopBar } from "@/components/TopBar";
import { isAdmin } from "@/lib/adminAccess";
import { ViewingBar } from "@/components/ViewingBar";
import { DeletionBanner } from "@/components/DeletionBanner";
import { AppFooter } from "@/components/AppFooter";
import { DraftScopeProvider } from "@/lib/forms/DraftScope";

/** "≈ 3 ads" while ads are on (a 30 s Standard ad), else "≈ 4 min of translation": the balance in plain units. */
function approxLabel(credits: number) {
  if (config.features.ads) return `≈ ${Math.floor(credits / adCredits({ seconds: 30, engine: "avatar_iii" }))} ads`;
  const min = credits / 60;
  return `≈ ${min < 10 ? Math.round(min * 10) / 10 : Math.round(min)} min of translation`;
}

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
  if (user && scope && !config.demoMode) {
    // First visit: the profile row, the personal workspace, and the free ad once the e-mail is verified (idempotent, cheap).
    const { ensurePersonalWorkspace, listWorkspacesFor } = await import("@/lib/workspaces");
    const profile = await getOrCreateProfile(user).catch(() => null);
    if (profile) await ensurePersonalWorkspace(user).then((personal) => ensureFreeAd(user, personal.id)).catch(() => {});
    if (profile?.deletionRequestedAt && !scope.viewing) deletionAt = deletionDate(profile.deletionRequestedAt).toISOString();
    workspaces = await listWorkspacesFor(user.id).catch(() => []);
  }
  const credits = user && scope && !config.demoMode ? await getCreditBalance(scope.workspaceId).catch(() => null) : null;
  const who = user && scope ? { email: user.email, name: user.name, credits, planKey: scope.planKey, workspace: { id: scope.workspaceId, name: scope.workspaceName, kind: scope.workspaceKind, role: scope.role }, workspaces, isAdmin: !config.demoMode && isAdmin(user.email) } : null;
  const support = supportEmail();
  // Form drafts belong to this user in this workspace (2 Nov 2026, src/lib/forms/formDraft.ts).
  const draftScope = user && scope ? { userId: user.id, workspaceId: scope.workspaceId } : null;
  return (
    <DraftScopeProvider scope={draftScope}>
    <div className="flex min-h-screen">
      <DemoRunner />
      <StatusWatcher />
      <PauseOffscreen />
      <ToolSearch />
      {/* The sidebar stays in view while the page scrolls; its middle scrolls on its own when the list is long. */}
      <div className="sticky top-0 hidden h-screen lg:block">
        <Suspense fallback={<div className="w-66" aria-hidden />}>
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
            <TopBar credits={credits !== null ? { balance: credits, approx: approxLabel(credits) } : null} supportHref={support ? `mailto:${support}` : "/contact"} />
          </Suspense>
        </div>
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-5 sm:px-6 md:px-8 lg:px-10 lg:pb-20 lg:pt-10">
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
    </DraftScopeProvider>
  );
}
