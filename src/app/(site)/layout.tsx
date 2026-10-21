import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeaderAccount, SignedOutButtons } from "@/components/site/HeaderAccount";
import { CookieBanner } from "@/components/site/CookieBanner";
import { ConsentScripts } from "@/components/site/ConsentScripts";

/** The public marketing site: its own header and footer, no app shell, no sign-in needed. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader
        account={
          <Suspense fallback={<SignedOutButtons />}>
            <HeaderAccount />
          </Suspense>
        }
      />
      <main className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">{children}</main>
      <SiteFooter />
      <CookieBanner />
      <ConsentScripts />
    </div>
  );
}
