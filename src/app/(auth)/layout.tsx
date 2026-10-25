import { CookieBanner } from "@/components/site/CookieBanner";
import { ConsentScripts } from "@/components/site/ConsentScripts";
import { HtmlLang } from "@/components/site/HtmlLang";

/**
 * Sign-in pages (log in, sign up, password, verify) without the site header and footer: a split
 * screen with the brand on the left and one card on the right (23 Oct 2026, after the layouts Tijs
 * sent). The pages render their own AuthShell; this layout only adds what every site page has.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <HtmlLang lang="en" />
      {children}
      <CookieBanner locale="en" />
      <ConsentScripts />
    </div>
  );
}
