import Link from "next/link";
import { brand, supportEmail } from "@/lib/brand";

const LINKS = [
  { href: "/", label: "Website" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/data", label: "Files and data" },
  { href: "/legal/affiliate-terms", label: "Partner terms" },
];

/** The app's footer (25 Nov 2026, after splister.com/app): the name, the legal texts and support on one quiet line. */
export function AppFooter() {
  const support = supportEmail();
  return (
    <footer className="mt-auto border-t border-divider">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 text-[13px] text-muted sm:px-6 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
        <span className="font-semibold text-ink">{brand.name}.</span>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="focus-ring rounded-control hover:text-ink">{l.label}</Link>
          ))}
          {support && <a href={`mailto:${support}`} className="focus-ring rounded-control hover:text-ink">{support}</a>}
        </nav>
        <span>© {brand.name}</span>
      </div>
    </footer>
  );
}
