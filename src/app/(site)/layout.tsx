import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

/** The public marketing site: its own header and footer, no app shell, no sign-in needed. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
