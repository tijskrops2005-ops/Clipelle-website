import Link from "next/link";
import { config } from "@/lib/config";
import { socialLinks, type SocialLink } from "@/content/social";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { footerColumnsFor } from "./siteNav";
import { Year } from "./Year";
import { CookieSettingsLink } from "./CookieBanner";
import { LogoFull } from "@/components/Logo";

/** Big footer: brand, five link columns, social icons only when src/content/social.ts lists them. Localized. */
export function SiteFooter({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const columns = footerColumnsFor(locale);
  return (
    <footer className="mt-24 border-t border-divider px-4 py-14 sm:mt-32 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-1">
          <Link href={localizePath("/", locale)} aria-label={config.productName} className="focus-ring inline-flex rounded-control">
            <LogoFull className="h-12" />
          </Link>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">{t.footer.tagline}</p>
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
        {columns.map((col, i) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="label-mono text-muted">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="focus-ring rounded-control text-[15px] text-ink/80 transition-colors duration-150 hover:text-ink">{l.label}</Link>
                </li>
              ))}
              {i === columns.length - 1 && <li><CookieSettingsLink label={t.footer.links.cookieSettings} /></li>}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-divider pt-6 text-[13px] text-muted">© <Year /> {config.productName}. {t.footer.copyright}</p>
    </footer>
  );
}

/** Simple original glyphs (no brand artwork): a letter in a circle keeps the footer light and licence-free. */
function SocialIcon({ kind }: { kind: SocialLink["kind"] }) {
  const letter = { linkedin: "in", youtube: "yt", instagram: "ig", tiktok: "tt", x: "x" }[kind];
  return <span className="label-mono" aria-hidden>{letter}</span>;
}
