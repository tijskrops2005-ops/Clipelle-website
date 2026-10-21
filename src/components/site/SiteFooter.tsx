import Link from "next/link";
import { config } from "@/lib/config";
import { socialLinks, type SocialLink } from "@/content/social";
import { footerColumns } from "./siteNav";
import { Year } from "./Year";
import { CookieSettingsLink } from "./CookieBanner";

/** Big footer: brand, five link columns from siteNav, social icons only when src/content/social.ts lists them. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-divider px-4 py-14 sm:mt-32 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" className="focus-ring inline-flex items-center gap-2.5 rounded-control">
            <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface">{config.productName.charAt(0)}</span>
            <span className="text-[17px] font-semibold tracking-tight text-ink">{config.productName}</span>
          </Link>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">{config.tagline}</p>
          {socialLinks.length > 0 && (
            <ul className="mt-5 flex gap-2" aria-label="Social links">
              {socialLinks.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="focus-ring grid size-9 place-items-center rounded-full bg-surface text-ink shadow-card transition-colors hover:bg-surface-muted">
                    <SocialIcon kind={s.kind} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {footerColumns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="label-mono text-muted">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="focus-ring rounded-control text-[15px] text-ink/80 transition-colors duration-150 hover:text-ink">{l.label}</Link>
                </li>
              ))}
              {col.title === "Legal" && <li><CookieSettingsLink /></li>}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-divider pt-6 text-[13px] text-muted">© <Year /> {config.productName}. All videos shown as examples were made with {config.productName}.</p>
    </footer>
  );
}

/** Simple original glyphs (no brand artwork): a letter in a circle keeps the footer light and licence-free. */
function SocialIcon({ kind }: { kind: SocialLink["kind"] }) {
  const letter = { linkedin: "in", youtube: "yt", instagram: "ig", tiktok: "tt", x: "x" }[kind];
  return <span className="label-mono" aria-hidden>{letter}</span>;
}
