import Link from "next/link";
import { config } from "@/lib/config";
import { footerColumns } from "./siteNav";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-divider px-4 py-14 sm:mt-32 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Link href="/" className="focus-ring inline-flex items-center gap-2.5 rounded-control">
            <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface">{config.productName.charAt(0)}</span>
            <span className="text-[17px] font-semibold tracking-tight text-ink">{config.productName}</span>
          </Link>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">{config.tagline}</p>
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
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-divider pt-6 text-[13px] text-muted">© {new Date().getFullYear()} {config.productName}. All videos shown as examples were made with {config.productName}.</p>
    </footer>
  );
}
