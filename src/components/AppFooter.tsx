import Link from "next/link";
import { supportEmail } from "@/lib/brand";

const LINKS = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/data", label: "Files and data" },
  { href: "/legal/affiliate-terms", label: "Partner terms" },
];

/** The app's footer (2 Nov 2026): the legal texts and the support address when one is set. */
export function AppFooter() {
  const support = supportEmail();
  return (
    <footer className="mx-auto mt-auto w-full max-w-[1180px] px-4 pb-8 pt-10 text-[12.5px] text-muted sm:px-6 md:px-8 lg:px-10">
      <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="focus-ring rounded-control hover:text-ink">{l.label}</Link>
        ))}
        {support && <a href={`mailto:${support}`} className="focus-ring rounded-control hover:text-ink">{support}</a>}
      </nav>
    </footer>
  );
}
